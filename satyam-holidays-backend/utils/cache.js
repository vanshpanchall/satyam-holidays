let redisClient;
let _initialized = false;
const logger = require("./logger");

/**
 * Generate a stable cache key from a query object by sorting keys
 */
function stableStringify(obj) {
  if (obj === null || obj === undefined) return "";
  if (typeof obj !== "object") return String(obj);
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map((key) => `${key}:${obj[key]}`);
  return pairs.join("|");
}

class CacheService {
  constructor() {
    this.client = null;
    this.defaultTTL = 3600; // 1 hour
    this.isConnected = false;
  }

  /**
   * Initialize the Redis client. Called once from server.js after Redis is set up
   * to avoid circular dependency issues.
   */
  init(client) {
    if (_initialized) return;
    _initialized = true;
    redisClient = client;
    this.client = redisClient;

    if (this.client) {
      // If already connected by the time init() is called
      if (this.client.isReady || this.client.isOpen) {
        this.isConnected = true;
        logger.info("[cache] Redis is already connected, cache enabled");
      }

      this.client.on("connect", () => {
        this.isConnected = true;
        logger.info("[cache] Redis connected, cache enabled");
      });

      this.client.on("ready", () => {
        this.isConnected = true;
      });

      this.client.on("error", () => {
        this.isConnected = false;
      });

      this.client.on("end", () => {
        this.isConnected = false;
      });
    }
  }

  async get(key) {
    if (!this.isConnected) return null;

    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error("Cache get error:", error);
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    if (!this.isConnected) return;

    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      logger.error("Cache set error:", error);
    }
  }

  async del(key) {
    if (!this.isConnected) return;

    try {
      await this.client.del(key);
    } catch (error) {
      logger.error("Cache delete error:", error);
    }
  }

  async invalidatePattern(pattern) {
    if (!this.isConnected) return;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      logger.error("Cache invalidate pattern error:", error);
    }
  }

  // Cache enquiry data
  async getEnquiries(query = {}) {
    const cacheKey = `enquiries:${stableStringify(query)}`;
    return this.get(cacheKey);
  }

  async setEnquiries(query = {}, data) {
    const cacheKey = `enquiries:${stableStringify(query)}`;
    await this.set(cacheKey, data, 1800); // 30 minutes
  }

  async invalidateEnquiries() {
    await this.invalidatePattern("enquiries:*");
  }

  // Cache package data
  async getPackages(query = {}) {
    const cacheKey = `packages:${stableStringify(query)}`;
    return this.get(cacheKey);
  }

  async setPackages(query = {}, data) {
    const cacheKey = `packages:${stableStringify(query)}`;
    await this.set(cacheKey, data, 3600); // 1 hour
  }

  async invalidatePackages() {
    await this.invalidatePattern("packages:*");
  }
}

module.exports = new CacheService();
