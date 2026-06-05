const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const Chat = require('../models/Chat');
const { AppError } = require('../middleware/errorHandler');

router.use(protect);

// Get all chats for current user
router.get('/', async (req, res, next) => {
  try {
    const chats = await Chat.find({ participants: req.user._id })
      .populate('participants', 'username profile.avatar presence.isOnline presence.lastSeen')
      .populate('lastMessage')
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ success: true, chats });
  } catch (err) {
    next(err);
  }
});

// Create or get direct chat
router.post('/direct', [body('userId').notEmpty()], validate, async (req, res, next) => {
  try {
    const { userId } = req.body;
    const myId = req.user._id;

    if (userId === myId.toString()) return next(new AppError('Cannot chat with yourself', 400));

    let chat = await Chat.findOne({
      type: 'direct',
      participants: { $all: [myId, userId], $size: 2 },
    }).populate('participants', 'username profile.avatar presence');

    if (!chat) {
      chat = await Chat.create({ type: 'direct', participants: [myId, userId] });
      await chat.populate('participants', 'username profile.avatar presence');
    }

    res.json({ success: true, chat });
  } catch (err) {
    next(err);
  }
});

router.get('/:chatId', async (req, res, next) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.chatId, participants: req.user._id })
      .populate('participants', 'username profile.avatar presence publicKey');
    if (!chat) return next(new AppError('Chat not found', 404));
    res.json({ success: true, chat });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
