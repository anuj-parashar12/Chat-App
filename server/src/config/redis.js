const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient = null;

const connectRedis = () => {
  const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 0,
    enableOfflineQueue: false,
    retryStrategy: (times) => Math.min(times * 500, 10000),
  });

  client.on('ready', () => {
    redisClient = client;
    logger.info('Redis connected');
  });
  client.on('error', (err) => logger.error('Redis error:', err));
  client.on('reconnecting', () => logger.warn('Redis reconnecting...'));
  client.on('close', () => {
    if (redisClient === client) redisClient = null;
  });

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      logger.warn('Redis unavailable at startup — continuing without Redis (caching and token blacklisting disabled)');
      resolve();
    }, 2000);

    client.once('ready', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
};

const getRedis = () => redisClient;

module.exports = connectRedis;
module.exports.getRedis = getRedis;
