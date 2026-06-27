const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { uploadSingle } = require('../config/cloudinary');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const { AppError } = require('../middleware/errorHandler');
const { getIO } = require('../sockets');

router.use(protect);

router.post('/upload/:chatId', uploadSingle('file'), async (req, res, next) => {
  try {
    if (!req.file) return next(new AppError('No file uploaded', 400));

    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findOne({ _id: chatId, participants: userId });
    if (!chat) return next(new AppError('Chat not found', 404));

    const mimeType = req.file.mimetype;
    let type = 'file';
    if (mimeType.startsWith('image/')) type = 'image';
    else if (mimeType.startsWith('video/')) type = 'video';
    else if (mimeType.startsWith('audio/')) type = 'audio';

    const message = await Message.create({
      chat: chatId,
      sender: userId,
      type,
      content: req.file.originalname,
      media: {
        url: req.file.path,
        publicId: req.file.filename,
        mimeType,
        size: req.file.size,
        name: req.file.originalname,
      },
    });

    await message.populate('sender', 'username profile.avatar');

    chat.lastMessage = message._id;
    await chat.save();

    const io = getIO();
    chat.participants.forEach((participantId) => {
      io.to(participantId.toString()).emit('new_message', { chatId, message });
    });

    res.status(201).json({ success: true, message });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
