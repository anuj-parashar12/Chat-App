const router = require('express').Router();
const { protect } = require('../middleware/auth');
const Analytics = require('../models/Analytics');
const Message = require('../models/Message');
const Call = require('../models/Call');
const Chat = require('../models/Chat');
const { AppError } = require('../middleware/errorHandler');

router.use(protect);

router.get('/:chatId', async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { days = 7 } = req.query;

    const chat = await Chat.findOne({ _id: chatId, participants: req.user._id });
    if (!chat) return next(new AppError('Chat not found', 404));

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [messageStats, callStats, mediaStats] = await Promise.all([
      Message.aggregate([
        { $match: { chat: chat._id, createdAt: { $gte: since }, isDeleted: false } },
        { $group: {
          _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, sender: '$sender' },
          count: { $sum: 1 },
        }},
      ]),
      Call.aggregate([
        { $match: { chat: chat._id, createdAt: { $gte: since }, status: 'ended' } },
        { $group: { _id: null, totalCalls: { $sum: 1 }, totalDuration: { $sum: '$duration' } } },
      ]),
      Message.aggregate([
        { $match: { chat: chat._id, createdAt: { $gte: since }, type: { $in: ['image', 'video', 'audio', 'file'] } } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
    ]);

    const messagesPerDay = {};
    const perUser = {};
    messageStats.forEach(({ _id, count }) => {
      messagesPerDay[_id.date] = (messagesPerDay[_id.date] || 0) + count;
      const uid = _id.sender.toString();
      perUser[uid] = (perUser[uid] || 0) + count;
    });

    const mostActiveUser = Object.entries(perUser).sort((a, b) => b[1] - a[1])[0];

    res.json({
      success: true,
      analytics: {
        messagesPerDay,
        perUser,
        mostActiveUser: mostActiveUser ? { userId: mostActiveUser[0], count: mostActiveUser[1] } : null,
        calls: callStats[0] || { totalCalls: 0, totalDuration: 0 },
        media: mediaStats,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
