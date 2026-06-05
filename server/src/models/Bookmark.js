const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    required: true,
  },
  category: {
    type: String,
    enum: ['study', 'work', 'personal', 'custom'],
    default: 'personal',
  },
  customCategory: { type: String, maxlength: 50 },
  note: { type: String, maxlength: 200 },
}, { timestamps: true });

bookmarkSchema.index({ user: 1, category: 1, createdAt: -1 });
bookmarkSchema.index({ user: 1, message: 1 }, { unique: true });

module.exports = mongoose.model('Bookmark', bookmarkSchema);
