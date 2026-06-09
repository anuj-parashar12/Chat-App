const User = require('../models/User');
const { getRedis } = require('../config/redis');

const ONLINE_TTL = 35; // seconds (slightly > ping interval)

const registerPresenceHandlers = (io, socket) => {
  const setOnline = async () => {
    const redis = getRedis();
    if (redis) await redis.setex(`presence:${socket.userId}`, ONLINE_TTL, 'online');

    await User.findByIdAndUpdate(socket.userId, {
      'presence.isOnline': true,
      'presence.status': 'online',
    });

    socket.broadcast.emit('user_online', { userId: socket.userId });
  };

  const setOffline = async () => {
    const redis = getRedis();
    if (redis) await redis.del(`presence:${socket.userId}`);

    await User.findByIdAndUpdate(socket.userId, {
      'presence.isOnline': false,
      'presence.status': 'offline',
      'presence.lastSeen': new Date(),
    });

    socket.broadcast.emit('user_offline', {
      userId: socket.userId,
      lastSeen: new Date(),
    });
  };

  setOnline();

  // Heartbeat to keep presence alive
  socket.on('heartbeat', async () => {
    const redis = getRedis();
    if (redis) await redis.expire(`presence:${socket.userId}`, ONLINE_TTL);
  });

  socket.on('set_status', async ({ status }) => {
    const validStatuses = ['online', 'away', 'busy'];
    if (!validStatuses.includes(status)) return;

    await User.findByIdAndUpdate(socket.userId, { 'presence.status': status });
    socket.broadcast.emit('user_status_changed', { userId: socket.userId, status });
  });

  socket.on('typing_start', ({ chatId }) => {
    socket.to(chatId).emit('user_typing', { chatId, userId: socket.userId });
  });

  socket.on('typing_stop', ({ chatId }) => {
    socket.to(chatId).emit('user_stopped_typing', { chatId, userId: socket.userId });
  });

  socket.on('disconnect', setOffline);
};

module.exports = { registerPresenceHandlers };
