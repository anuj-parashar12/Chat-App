const Whiteboard = require('../models/Whiteboard');
const Chat = require('../models/Chat');

const registerWhiteboardHandlers = (io, socket) => {
  socket.on('whiteboard:join', async ({ chatId }) => {
    const chat = await Chat.findOne({ _id: chatId, participants: socket.userId });
    if (!chat) return;

    const wb = await Whiteboard.findOneAndUpdate(
      { chat: chatId },
      { $addToSet: { activeUsers: socket.userId } },
      { upsert: true, new: true }
    );

    socket.join(`wb:${chatId}`);
    socket.to(`wb:${chatId}`).emit('whiteboard:user_joined', { userId: socket.userId });
    socket.emit('whiteboard:state', { canvasData: wb.canvasData });
  });

  socket.on('whiteboard:draw', async ({ chatId, drawData }) => {
    socket.to(`wb:${chatId}`).emit('whiteboard:draw', { drawData, by: socket.userId });
  });

  socket.on('whiteboard:clear', async ({ chatId }) => {
    await Whiteboard.findOneAndUpdate({ chat: chatId }, { canvasData: '{}', lastModifiedBy: socket.userId });
    io.to(`wb:${chatId}`).emit('whiteboard:cleared', { by: socket.userId });
  });

  socket.on('whiteboard:save', async ({ chatId, canvasData }) => {
    await Whiteboard.findOneAndUpdate(
      { chat: chatId },
      { canvasData, lastModifiedBy: socket.userId }
    );
    socket.emit('whiteboard:saved');
  });

  socket.on('whiteboard:leave', async ({ chatId }) => {
    await Whiteboard.findOneAndUpdate(
      { chat: chatId },
      { $pull: { activeUsers: socket.userId } }
    );
    socket.leave(`wb:${chatId}`);
    socket.to(`wb:${chatId}`).emit('whiteboard:user_left', { userId: socket.userId });
  });
};

module.exports = { registerWhiteboardHandlers };
