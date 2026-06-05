const router = require('express').Router();
const { protect } = require('../middleware/auth');
const Call = require('../models/Call');
const Chat = require('../models/Chat');

router.use(protect);

router.get('/history', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userChats = await Chat.find({ participants: req.user._id }).select('_id');
    const chatIds = userChats.map((c) => c._id);

    const calls = await Call.find({ chat: { $in: chatIds } })
      .populate('initiator', 'username profile.avatar')
      .populate('participants.user', 'username profile.avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, calls });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
