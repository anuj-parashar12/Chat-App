const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const Bookmark = require('../models/Bookmark');
const { AppError } = require('../middleware/errorHandler');

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const { category, q } = req.query;
    const query = { user: req.user._id };
    if (category) query.category = category;

    const bookmarks = await Bookmark.find(query)
      .populate({ path: 'message', populate: { path: 'sender', select: 'username profile.avatar' } })
      .sort({ createdAt: -1 });

    const filtered = q
      ? bookmarks.filter((b) => b.message?.content?.toLowerCase().includes(q.toLowerCase()))
      : bookmarks;

    res.json({ success: true, bookmarks: filtered });
  } catch (err) {
    next(err);
  }
});

router.post('/', [body('messageId').notEmpty(), body('category').optional()], validate, async (req, res, next) => {
  try {
    const bookmark = await Bookmark.create({
      user: req.user._id,
      message: req.body.messageId,
      category: req.body.category || 'personal',
      customCategory: req.body.customCategory,
      note: req.body.note,
    });
    res.status(201).json({ success: true, bookmark });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const bookmark = await Bookmark.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!bookmark) return next(new AppError('Bookmark not found', 404));
    res.json({ success: true, message: 'Bookmark removed.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
