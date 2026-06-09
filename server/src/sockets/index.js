const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const { registerChatHandlers } = require('./chatHandlers');
const { registerPresenceHandlers } = require('./presenceHandlers');
const { registerCallHandlers } = require('./callHandlers');
const { registerWhiteboardHandlers } = require('./whiteboardHandlers');

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Redis adapter for horizontal scaling
  if (process.env.REDIS_URL) {
    const pubClient = new Redis(process.env.REDIS_URL, {
      retryStrategy: (times) => Math.min(times * 500, 10000),
      maxRetriesPerRequest: null,
    });
    const subClient = pubClient.duplicate();
    pubClient.on('error', (err) => logger.error('Socket pubClient Redis error:', err));
    subClient.on('error', (err) => logger.error('Socket subClient Redis error:', err));
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('Socket.IO Redis adapter initialized');
  }

  // Auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('username profile.avatar presence');
      if (!user) return next(new Error('User not found'));

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    logger.info(`Socket connected: ${socket.userId}`);

    // Join personal room for targeted messages
    socket.join(socket.userId);

    registerPresenceHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerCallHandlers(io, socket);
    registerWhiteboardHandlers(io, socket);

    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected: ${socket.userId}`);
    });

    socket.on('error', (err) => {
      logger.error(`Socket error for ${socket.userId}:`, err);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};

module.exports = { initializeSocket, getIO };
