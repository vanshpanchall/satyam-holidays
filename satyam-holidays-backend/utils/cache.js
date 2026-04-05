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
    // Track cached keys for smarter invalidation
    this.keyRegistry = new Map();
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
      // Track key in registry for smarter invalidation
      const [namespace] = key.split(":");
      if (namespace) {
        if (!this.keyRegistry.has(namespace)) {
          this.keyRegistry.set(namespace, new Set());
        }
        this.keyRegistry.get(namespace).add(key);
      }
    } catch (error) {
      logger.error("Cache set error:", error);
    }
  }

  async del(key) {
    if (!this.isConnected) return;

    try {
      await this.client.del(key);
      // Remove from registry
      const [namespace] = key.split(":");
      if (namespace && this.keyRegistry.has(namespace)) {
        this.keyRegistry.get(namespace).delete(key);
      }
    } catch (error) {
      logger.error("Cache delete error:", error);
    }
  }

  /**
   * Invalidate all keys matching a pattern using the registry
   * Avoids expensive KEYS command on Redis
   */
  async invalidatePattern(pattern) {
    if (!this.isConnected) return;

    try {
      const namespace = pattern.replace(":*", "").replace("*", "");
      const keysToDelete = [];

      if (this.keyRegistry.has(namespace)) {
        const keys = this.keyRegistry.get(namespace);
        for (const key of keys) {
          keysToDelete.push(key);
        }
        this.keyRegistry.delete(namespace);
      }

      // Fallback to SCAN for any missed keys (safer than KEYS for large datasets)
      if (keysToDelete.length === 0 && pattern.includes("*")) {
        let cursor = 0;
        do {
          const result = await this.client.scan(cursor, {
            MATCH: pattern,
            COUNT: 100,
          });
          cursor = result.cursor;
          keysToDelete.push(...result.keys);
        } while (cursor !== 0);
      }

      if (keysToDelete.length > 0) {
        await this.client.del(keysToDelete);
        logger.debug(`[cache] Invalidated ${keysToDelete.length} keys matching ${pattern}`);
      }
    } catch (error) {
      logger.error("Cache invalidate pattern error:", error);
    }
  }

  /**
   * Invalidate specific keys by their full key names
   * More efficient than pattern-based invalidation
   */
  async invalidateKeys(keys) {
    if (!this.isConnected || !keys || keys.length === 0) return;

    try {
      await this.client.del(keys);
      // Clean up registry
      for (const key of keys) {
        const [namespace] = key.split(":");
        if (namespace && this.keyRegistry.has(namespace)) {
          this.keyRegistry.get(namespace).delete(key);
        }
      }
    } catch (error) {
      logger.error("Cache invalidate keys error:", error);
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

  /**
   * Smart package invalidation - only invalidate affected cache entries
   * @param {string} packageId - If provided, only invalidate entries containing this package
   * @param {string} category - If provided, only invalidate entries for this category
   */
  async invalidatePackages(packageId = null, category = null) {
    if (!this.isConnected) return;

    // If specific criteria, try to be smart
    if ((packageId || category) && this.keyRegistry.has("packages")) {
      const keys = this.keyRegistry.get("packages");
      const keysToInvalidate = [];

      for (const key of keys) {
        // If category specified, check if key matches
        if (category && key.includes(`category:${category}`)) {
          keysToInvalidate.push(key);
        } else if (!category && !packageId) {
          // No specific criteria, invalidate all
          keysToInvalidate.push(key);
        } else {
          // For package-specific invalidation, we need to check the cached data
          // This is expensive, so we just invalidate all for now
          keysToInvalidate.push(key);
        }
      }

      if (keysToInvalidate.length > 0) {
        await this.invalidateKeys(keysToInvalidate);
      }
      return;
    }

    // Fallback to full pattern invalidation
    await this.invalidatePattern("packages:*");
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const stats = {
      isConnected: this.isConnected,
      namespaces: {},
    };

    for (const [namespace, keys] of this.keyRegistry) {
      stats.namespaces[namespace] = keys.size;
    }

    return stats;
  }
}

module.exports = new CacheService();
