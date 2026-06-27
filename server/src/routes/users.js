const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { uploadSingle } = require('../config/cloudinary');
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');

router.use(protect);

router.get('/me', (req, res) => {
  res.json({ success: true, user: req.user.toPublicJSON() });
});

router.patch('/me', [
  body('profile.bio').optional().isLength({ max: 200 }),
  body('profile.displayName').optional().isLength({ max: 50 }),
], validate, async (req, res, next) => {
  try {
    const { profile, settings, publicKey } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { ...(profile && { profile }), ...(settings && { settings }), ...(publicKey && { publicKey }) } },
      { new: true, runValidators: true }
    );
    res.json({ success: true, user: user.toPublicJSON() });
  } catch (err) {
    next(err);
  }
});

router.post('/me/avatar', uploadSingle('avatar'), async (req, res, next) => {
  try {
    if (!req.file) return next(new AppError('No file uploaded', 400));
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { 'profile.avatar': req.file.path },
      { new: true }
    );
    res.json({ success: true, avatar: user.profile.avatar });
  } catch (err) {
    next(err);
  }
});

router.get('/:userId', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).select('username profile presence publicKey createdAt');
    if (!user) return next(new AppError('User not found', 404));
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

router.post('/block/:userId', async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { blockedUsers: req.params.userId } });
    res.json({ success: true, message: 'User blocked.' });
  } catch (err) {
    next(err);
  }
});

router.delete('/block/:userId', async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $pull: { blockedUsers: req.params.userId } });
    res.json({ success: true, message: 'User unblocked.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
