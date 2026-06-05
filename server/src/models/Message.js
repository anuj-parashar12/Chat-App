const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
  emoji: { type: String, required: true },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { _id: false });

const messageSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Encrypted ciphertext; server never stores plaintext for E2EE chats
  content: { type: String, default: '' },
  // For group chats: map of recipientId -> encryptedContent
  encryptedContent: { type: Map, of: String },
  isEncrypted: { type: Boolean, default: false },

  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'file', 'gif', 'system', 'call'],
    default: 'text',
  },
  media: {
    url: String,
    publicId: String,
    mimeType: String,
    size: Number,
    name: String,
    thumbnail: String,
    duration: Number, // for audio/video in seconds
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },
  forwardedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },
  reactions: [reactionSchema],

  readBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now },
  }],
  deliveredTo: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deliveredAt: { type: Date, default: Date.now },
  }],

  isEdited: { type: Boolean, default: false },
  editHistory: [{
    content: String,
    editedAt: { type: Date, default: Date.now },
  }],
  isDeleted: { type: Boolean, default: false },
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deletedAt: Date,
}, { timestamps: true });

messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ 'readBy.user': 1 });
messageSchema.index({ content: 'text' }); // full-text search

module.exports = mongoose.model('Message', messageSchema);
