const mongoose = require('mongoose');

const whiteboardSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
    unique: true,
  },
  // Serialized canvas state (JSON string of fabric.js canvas or similar)
  canvasData: { type: String, default: '{}' },
  activeUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Whiteboard', whiteboardSchema);
