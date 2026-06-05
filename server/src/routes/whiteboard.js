const router = require('express').Router();
const { protect } = require('../middleware/auth');
const Whiteboard = require('../models/Whiteboard');
const Chat = require('../models/Chat');
const { AppError } = require('../middleware/errorHandler');

router.use(protect);

router.get('/:chatId', async (req, res, next) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.chatId, participants: req.user._id });
    if (!chat) return next(new AppError('Chat not found', 404));

    const wb = await Whiteboard.findOne({ chat: req.params.chatId });
    res.json({ success: true, whiteboard: wb || { canvasData: '{}', activeUsers: [] } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
