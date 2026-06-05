const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const Reminder = require('../models/Reminder');
const { AppError } = require('../middleware/errorHandler');

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const reminders = await Reminder.find({ user: req.user._id, isCancelled: false })
      .populate('message', 'content type')
      .sort({ scheduledAt: 1 });
    res.json({ success: true, reminders });
  } catch (err) {
    next(err);
  }
});

router.post('/', [
  body('title').notEmpty().isLength({ max: 200 }),
  body('scheduledAt').isISO8601(),
], validate, async (req, res, next) => {
  try {
    const { title, note, scheduledAt, messageId } = req.body;
    if (new Date(scheduledAt) <= new Date()) {
      return next(new AppError('Scheduled time must be in the future', 400));
    }
    const reminder = await Reminder.create({
      user: req.user._id,
      title,
      note,
      scheduledAt: new Date(scheduledAt),
      message: messageId,
    });
    res.status(201).json({ success: true, reminder });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isCancelled: true },
      { new: true }
    );
    if (!reminder) return next(new AppError('Reminder not found', 404));
    res.json({ success: true, message: 'Reminder cancelled.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
