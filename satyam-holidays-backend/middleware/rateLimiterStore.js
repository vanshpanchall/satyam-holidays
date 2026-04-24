const { MemoryStore } = require("express-rate-limit");
const logger = require("../utils/logger");

let redisClient = null;

class DistributedRateLimitStore {
  constructor(prefix = "rl:") {
    this.prefix = prefix;
    this.memoryStore = new MemoryStore();
  }

  init(options) {
    this.options = options;
    this.memoryStore.init(options);
  }

  async increment(key) {
    if (redisClient && redisClient.isOpen) {
      const redisKey = `${this.prefix}${key}`;
      const windowMs = this.options.windowMs;

      try {
        const p = redisClient.multi();
        p.incr(redisKey);
        p.ttl(redisKey);
        const [hits, ttl] = await p.exec();

        let resetTime;
        if (ttl === -1 || hits === 1) {
          const expireSeconds = Math.ceil(windowMs / 1000);
          await redisClient.expire(redisKey, expireSeconds);
          resetTime = new Date(Date.now() + windowMs);
        } else {
          resetTime = new Date(Date.now() + ttl * 1000);
        }

        return {
          totalHits: hits,
          resetTime,
        };
      } catch (err) {
        logger.error("Redis rate limit error, falling back to memory:", err);
        return this.memoryStore.increment(key);
      }
    }

    return this.memoryStore.increment(key);
  }

  async decrement(key) {
    if (redisClient && redisClient.isOpen) {
      const redisKey = `${this.prefix}${key}`;
      try {
        await redisClient.decr(redisKey);
        return;
      } catch (err) {
        logger.error("Redis rate limit decrement error, falling back to memory:", err);
      }
    }
    return this.memoryStore.decrement(key);
  }

  async resetKey(key) {
    if (redisClient && redisClient.isOpen) {
      const redisKey = `${this.prefix}${key}`;
      try {
        await redisClient.del(redisKey);
        return;
      } catch (err) {
        logger.error("Redis rate limit reset error, falling back to memory:", err);
      }
    }
    return this.memoryStore.resetKey(key);
  }
}

module.exports = {
  DistributedRateLimitStore,
  init: (client) => {
    redisClient = client;
  },
};
