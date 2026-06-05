const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
  },
  date: { type: Date, required: true }, // start of day UTC
  metrics: {
    totalMessages: { type: Number, default: 0 },
    mediaShared: { type: Number, default: 0 },
    callsInitiated: { type: Number, default: 0 },
    totalCallDuration: { type: Number, default: 0 }, // seconds
    activeUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    perUser: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      messageCount: { type: Number, default: 0 },
      avgResponseTime: { type: Number, default: 0 }, // ms
    }],
  },
}, { timestamps: true });

analyticsSchema.index({ chat: 1, date: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);
