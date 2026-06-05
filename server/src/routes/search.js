const router = require('express').Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Message = require('../models/Message');
const Chat = require('../models/Chat');

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const { q, type = 'all', chatId, sender, mediaType, dateFrom, dateTo } = req.query;
    if (!q || q.length < 2) return res.json({ success: true, results: {} });

    const userId = req.user._id;
    const results = {};

    if (type === 'all' || type === 'users') {
      results.users = await User.find({
        $or: [
          { username: { $regex: q, $options: 'i' } },
          { 'profile.displayName': { $regex: q, $options: 'i' } },
        ],
        _id: { $ne: userId },
      }).select('username profile.avatar presence.isOnline').limit(10);
    }

    if (type === 'all' || type === 'messages') {
      const userChats = await Chat.find({ participants: userId }).select('_id');
      const chatIds = userChats.map((c) => c._id);

      const msgQuery = {
        chat: { $in: chatIds },
        $text: { $search: q },
        isDeleted: false,
        deletedFor: { $ne: userId },
      };
      if (chatId) msgQuery.chat = chatId;
      if (sender) msgQuery.sender = sender;
      if (mediaType) msgQuery.type = mediaType;
      if (dateFrom || dateTo) {
        msgQuery.createdAt = {};
        if (dateFrom) msgQuery.createdAt.$gte = new Date(dateFrom);
        if (dateTo) msgQuery.createdAt.$lte = new Date(dateTo);
      }

      results.messages = await Message.find(msgQuery)
        .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
        .limit(20)
        .populate('sender', 'username profile.avatar')
        .populate('chat', 'name type');
    }

    if (type === 'all' || type === 'groups') {
      results.groups = await Chat.find({
        type: 'group',
        participants: userId,
        name: { $regex: q, $options: 'i' },
      }).select('name avatar description').limit(10);
    }

    res.json({ success: true, results });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
