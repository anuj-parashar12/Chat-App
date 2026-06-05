require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initializeSocket } = require('./sockets');
const connectDB = require('./config/database');
const connectRedis = require('./config/redis');
const logger = require('./utils/logger');
const { startReminderScheduler } = require('./services/reminderService');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

initializeSocket(server);

const start = async () => {
  try {
    await connectDB();
    await connectRedis();
    startReminderScheduler();

    server.listen(PORT, () => {
      logger.info(`NexChat server running on port ${PORT} [${process.env.NODE_ENV}]`);
    });
  } catch (err) {
    logger.error('Server startup failed:', err);
    process.exit(1);
  }
};

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled rejection:', err);
  server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Graceful shutdown...');
  server.close(() => process.exit(0));
});

start();
