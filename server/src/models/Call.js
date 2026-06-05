const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
  },
  initiator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  participants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    joinedAt: Date,
    leftAt: Date,
    status: { type: String, enum: ['invited', 'accepted', 'declined', 'missed', 'busy'] },
  }],
  type: {
    type: String,
    enum: ['voice', 'video'],
    required: true,
  },
  status: {
    type: String,
    enum: ['ringing', 'ongoing', 'ended', 'missed', 'rejected'],
    default: 'ringing',
  },
  startedAt: Date,
  endedAt: Date,
  duration: Number, // seconds
  recordingMetadata: {
    url: String,
    size: Number,
    duration: Number,
  },
  screenShared: { type: Boolean, default: false },
}, { timestamps: true });

callSchema.index({ chat: 1, createdAt: -1 });
callSchema.index({ initiator: 1 });

module.exports = mongoose.model('Call', callSchema);
