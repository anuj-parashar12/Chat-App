const Message = require('../models/Message');
const Chat = require('../models/Chat');
const { AppError } = require('../middleware/errorHandler');
const { getRedis } = require('../config/redis');
const { getIO } = require('../sockets');

const MESSAGES_PER_PAGE = 30;
const CACHE_TTL = 300; // 5 min

exports.getMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { page = 1, before } = req.query;
    const userId = req.user._id;

    const chat = await Chat.findOne({ _id: chatId, participants: userId });
    if (!chat) return next(new AppError('Chat not found', 404));

    const redis = getRedis();
    const cacheKey = `messages:${chatId}:page:${page}`;
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached && !before) {
        return res.json({ success: true, ...JSON.parse(cached) });
      }
    }

    const query = {
      chat: chatId,
      deletedFor: { $ne: userId },
      isDeleted: false,
    };
    if (before) query.createdAt = { $lt: new Date(before) };

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * MESSAGES_PER_PAGE)
      .limit(MESSAGES_PER_PAGE)
      .populate('sender', 'username profile.avatar')
      .populate('replyTo', 'content sender type')
      .lean();

    const total = await Message.countDocuments(query);
    const payload = {
      messages: messages.reverse(),
      pagination: {
        page: Number(page),
        total,
        pages: Math.ceil(total / MESSAGES_PER_PAGE),
        hasMore: total > page * MESSAGES_PER_PAGE,
      },
    };

    if (redis && !before) await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(payload));

    res.json({ success: true, ...payload });
  } catch (err) {
    next(err);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const { chatId, content, type = 'text', replyTo, isEncrypted, encryptedContent } = req.body;
    const userId = req.user._id;

    const chat = await Chat.findOne({ _id: chatId, participants: userId });
    if (!chat) return next(new AppError('Chat not found', 404));

    const message = await Message.create({
      chat: chatId,
      sender: userId,
      content,
      type,
      replyTo,
      isEncrypted: isEncrypted || false,
      encryptedContent,
    });

    await message.populate('sender', 'username profile.avatar');
    if (replyTo) await message.populate('replyTo', 'content sender type');

    // Update chat lastMessage & unread counts
    const otherParticipants = chat.participants.filter(
      (p) => p.toString() !== userId.toString()
    );
    chat.lastMessage = message._id;
    chat.unreadCounts = chat.unreadCounts.map((uc) => {
      if (otherParticipants.some((p) => p.toString() === uc.user.toString())) {
        return { ...uc.toObject(), count: uc.count + 1 };
      }
      return uc;
    });
    await chat.save();

    // Invalidate message cache
    const redis = getRedis();
    if (redis) {
      const keys = await redis.keys(`messages:${chatId}:*`);
      if (keys.length) await redis.del(...keys);
    }

    // Emit via Socket.IO
    const io = getIO();
    chat.participants.forEach((participantId) => {
      io.to(participantId.toString()).emit('new_message', {
        chatId,
        message,
      });
    });

    res.status(201).json({ success: true, message });
  } catch (err) {
    next(err);
  }
};

exports.editMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const message = await Message.findOne({ _id: messageId, sender: userId });
    if (!message) return next(new AppError('Message not found', 404));
    if (message.type !== 'text') return next(new AppError('Only text messages can be edited', 400));

    message.editHistory.push({ content: message.content });
    message.content = content;
    message.isEdited = true;
    await message.save();

    const io = getIO();
    const chat = await Chat.findById(message.chat);
    chat.participants.forEach((participantId) => {
      io.to(participantId.toString()).emit('message_edited', {
        chatId: message.chat,
        messageId: message._id,
        content,
        isEdited: true,
      });
    });

    res.json({ success: true, message });
  } catch (err) {
    next(err);
  }
};

exports.deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { deleteFor = 'me' } = req.body; // 'me' | 'everyone'
    const userId = req.user._id;

    const message = await Message.findOne({ _id: messageId, sender: userId });
    if (!message) return next(new AppError('Message not found', 404));

    if (deleteFor === 'everyone') {
      message.isDeleted = true;
      message.content = '';
      message.deletedAt = new Date();
    } else {
      message.deletedFor.push(userId);
    }
    await message.save();

    if (deleteFor === 'everyone') {
      const io = getIO();
      const chat = await Chat.findById(message.chat);
      chat.participants.forEach((participantId) => {
        io.to(participantId.toString()).emit('message_deleted', {
          chatId: message.chat,
          messageId: message._id,
          deleteFor: 'everyone',
        });
      });
    }

    res.json({ success: true, message: 'Message deleted.' });
  } catch (err) {
    next(err);
  }
};

exports.reactToMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const validEmojis = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
    if (!validEmojis.includes(emoji)) return next(new AppError('Invalid reaction emoji', 400));

    const message = await Message.findById(messageId);
    if (!message) return next(new AppError('Message not found', 404));

    const existing = message.reactions.find((r) => r.emoji === emoji);
    if (existing) {
      // Use findIndex with toString() comparison — ObjectId !== string with indexOf
      const userIdx = existing.users.findIndex((u) => u.toString() === userId.toString());
      if (userIdx > -1) {
        existing.users.splice(userIdx, 1); // toggle off
      } else {
        existing.users.push(userId);
      }
    } else {
      message.reactions.push({ emoji, users: [userId] });
    }
    // Remove empty reactions
    message.reactions = message.reactions.filter((r) => r.users.length > 0);
    await message.save();

    const io = getIO();
    const chat = await Chat.findById(message.chat);
    chat.participants.forEach((participantId) => {
      io.to(participantId.toString()).emit('message_reaction', {
        chatId: message.chat,
        messageId: message._id,
        reactions: message.reactions,
      });
    });

    res.json({ success: true, reactions: message.reactions });
  } catch (err) {
    next(err);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    await Message.updateMany(
      {
        chat: chatId,
        'readBy.user': { $ne: userId },
        sender: { $ne: userId },
      },
      { $push: { readBy: { user: userId, readAt: new Date() } } }
    );

    // Reset unread count
    await Chat.updateOne(
      { _id: chatId, 'unreadCounts.user': userId },
      { $set: { 'unreadCounts.$.count': 0 } }
    );

    const io = getIO();
    const chat = await Chat.findById(chatId);
    chat.participants.forEach((participantId) => {
      io.to(participantId.toString()).emit('messages_read', {
        chatId,
        readBy: userId,
        readAt: new Date(),
      });
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
