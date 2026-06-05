const Call = require('../models/Call');
const Chat = require('../models/Chat');

// WebRTC signaling via Socket.IO
const registerCallHandlers = (io, socket) => {
  socket.on('call:initiate', async ({ chatId, type, offer }) => {
    const chat = await Chat.findOne({ _id: chatId, participants: socket.userId });
    if (!chat) return;

    const call = await Call.create({
      chat: chatId,
      initiator: socket.userId,
      type,
      participants: chat.participants.map((p) => ({
        user: p,
        status: p.toString() === socket.userId ? 'accepted' : 'invited',
      })),
    });

    // Signal all other participants
    chat.participants.forEach((participantId) => {
      if (participantId.toString() !== socket.userId) {
        io.to(participantId.toString()).emit('call:incoming', {
          callId: call._id,
          chatId,
          type,
          initiator: socket.userId,
          offer,
        });
      }
    });
  });

  socket.on('call:answer', async ({ callId, answer, chatId }) => {
    await Call.findByIdAndUpdate(callId, {
      status: 'ongoing',
      startedAt: new Date(),
      'participants.$[elem].status': 'accepted',
      'participants.$[elem].joinedAt': new Date(),
    }, {
      arrayFilters: [{ 'elem.user': socket.userId }],
    });

    socket.to(chatId).emit('call:answered', { callId, answer, from: socket.userId });
  });

  socket.on('call:reject', async ({ callId, chatId }) => {
    await Call.findByIdAndUpdate(callId, {
      'participants.$[elem].status': 'declined',
    }, { arrayFilters: [{ 'elem.user': socket.userId }] });

    socket.to(chatId).emit('call:rejected', { callId, by: socket.userId });
  });

  socket.on('call:end', async ({ callId, chatId }) => {
    const call = await Call.findById(callId);
    if (!call) return;

    const duration = call.startedAt
      ? Math.round((Date.now() - call.startedAt) / 1000)
      : 0;

    await Call.findByIdAndUpdate(callId, {
      status: 'ended',
      endedAt: new Date(),
      duration,
      'participants.$[elem].leftAt': new Date(),
    }, { arrayFilters: [{ 'elem.user': socket.userId }] });

    io.to(chatId).emit('call:ended', { callId, duration, endedBy: socket.userId });
  });

  // WebRTC ICE candidate relay
  socket.on('call:ice_candidate', ({ callId, chatId, candidate, to }) => {
    io.to(to).emit('call:ice_candidate', { callId, candidate, from: socket.userId });
  });

  // Screen share signals
  socket.on('call:screen_share_start', ({ chatId }) => {
    socket.to(chatId).emit('call:screen_share_started', { by: socket.userId });
  });

  socket.on('call:screen_share_stop', ({ chatId }) => {
    socket.to(chatId).emit('call:screen_share_stopped', { by: socket.userId });
  });
};

module.exports = { registerCallHandlers };
