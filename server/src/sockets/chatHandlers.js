const Chat = require('../models/Chat');

const registerChatHandlers = (io, socket) => {
  // Join all chat rooms the user participates in
  const joinUserChats = async () => {
    const chats = await Chat.find({ participants: socket.userId }).select('_id');
    chats.forEach((chat) => socket.join(chat._id.toString()));
  };

  joinUserChats();

  socket.on('join_chat', async ({ chatId }) => {
    const chat = await Chat.findOne({ _id: chatId, participants: socket.userId });
    if (chat) socket.join(chatId);
  });

  socket.on('leave_chat', ({ chatId }) => {
    socket.leave(chatId);
  });

  // Delivered receipt — fired when client receives a message
  socket.on('message_delivered', ({ messageId, chatId }) => {
    socket.to(chatId).emit('message_delivered_ack', {
      messageId,
      deliveredTo: socket.userId,
      deliveredAt: new Date(),
    });
  });
};

module.exports = { registerChatHandlers };
