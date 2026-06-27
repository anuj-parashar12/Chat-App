const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { uploadSingle } = require('../config/cloudinary');
const Chat = require('../models/Chat');
const { AppError } = require('../middleware/errorHandler');
const { getIO } = require('../sockets');

router.use(protect);

router.post('/', [
  body('name').trim().notEmpty().isLength({ max: 100 }),
  body('members').isArray({ min: 1 }),
], validate, async (req, res, next) => {
  try {
    const { name, description, members } = req.body;
    const allMembers = [...new Set([req.user._id.toString(), ...members])];

    const group = await Chat.create({
      type: 'group',
      name,
      description,
      participants: allMembers,
      admins: [req.user._id],
      createdBy: req.user._id,
      unreadCounts: allMembers.map((m) => ({ user: m, count: 0 })),
    });

    await group.populate('participants', 'username profile.avatar');

    // Notify all members
    const io = getIO();
    allMembers.forEach((memberId) => {
      io.to(memberId).emit('group_created', { group });
    });

    res.status(201).json({ success: true, group });
  } catch (err) {
    next(err);
  }
});

router.patch('/:groupId', uploadSingle('avatar'), async (req, res, next) => {
  try {
    const group = await Chat.findOne({ _id: req.params.groupId, type: 'group', admins: req.user._id });
    if (!group) return next(new AppError('Group not found or insufficient permissions', 404));

    const { name, description } = req.body;
    if (name) group.name = name;
    if (description) group.description = description;
    if (req.file) group.avatar = req.file.path;
    await group.save();

    const io = getIO();
    group.participants.forEach((p) => {
      io.to(p.toString()).emit('group_updated', { groupId: group._id, name: group.name, description: group.description, avatar: group.avatar });
    });

    res.json({ success: true, group });
  } catch (err) {
    next(err);
  }
});

router.post('/:groupId/members', [body('userId').notEmpty()], validate, async (req, res, next) => {
  try {
    const group = await Chat.findOne({ _id: req.params.groupId, type: 'group', admins: req.user._id });
    if (!group) return next(new AppError('Group not found or insufficient permissions', 404));

    group.participants.addToSet(req.body.userId);
    group.unreadCounts.push({ user: req.body.userId, count: 0 });
    await group.save();

    const io = getIO();
    io.to(req.body.userId).emit('group_added', { group: { _id: group._id, name: group.name } });
    group.participants.forEach((p) => {
      io.to(p.toString()).emit('member_added', { groupId: group._id, userId: req.body.userId });
    });

    res.json({ success: true, message: 'Member added.' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:groupId/members/:userId', async (req, res, next) => {
  try {
    const group = await Chat.findOne({ _id: req.params.groupId, type: 'group', admins: req.user._id });
    if (!group) return next(new AppError('Group not found or insufficient permissions', 404));

    group.participants.pull(req.params.userId);
    group.admins.pull(req.params.userId);
    await group.save();

    const io = getIO();
    io.to(req.params.userId).emit('group_removed', { groupId: group._id });
    group.participants.forEach((p) => {
      io.to(p.toString()).emit('member_removed', { groupId: group._id, userId: req.params.userId });
    });

    res.json({ success: true, message: 'Member removed.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
