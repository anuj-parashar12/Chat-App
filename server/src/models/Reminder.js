const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },
  title: { type: String, required: true, maxlength: 200 },
  note: { type: String, maxlength: 500 },
  scheduledAt: { type: Date, required: true },
  isTriggered: { type: Boolean, default: false },
  triggeredAt: Date,
  isCancelled: { type: Boolean, default: false },
}, { timestamps: true });

reminderSchema.index({ user: 1, isTriggered: 1, scheduledAt: 1 });
reminderSchema.index({ scheduledAt: 1, isTriggered: 1, isCancelled: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);
