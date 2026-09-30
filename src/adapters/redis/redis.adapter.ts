import Redis from 'ioredis';
import Logger from '../../utils/logger';
import { config } from '../../config';

export interface RedisAdapterConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
}

export interface RedisAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string | string[]): Promise<number>;
  exists(key: string): Promise<boolean>;
  getJson<T = any>(key: string): Promise<T | null>;
  setJson(key: string, value: any, ttlSeconds?: number): Promise<void>;
  flushDb(): Promise<void>;

  // High-level QA helpers
  getOtp(identifier: string): Promise<string | null>;
  clearRateLimit(identifier: string): Promise<void>;

  // Session & Auth Token caching helpers
  setSession(sessionId: string, sessionData: any, ttlSeconds?: number): Promise<void>;
  getSession<T = any>(sessionId: string): Promise<T | null>;
  invalidateSession(sessionId: string): Promise<boolean>;
}

interface InMemoryItem {
  value: string;
  expiresAt?: number;
}

/**
 * Redis Adapter for test automation.
 * Supports multi-instance configuration (e.g. Automation Runner Redis vs Target SUT Redis)
 * with live connection and resilient in-memory fallback.
 */
export class RedisCacheAdapter implements RedisAdapter {
  private isConnected: boolean = false;
  private readonly redisConfig: RedisAdapterConfig;
  private readonly instanceName: string;
  private client: Redis | null = null;
  private useInMemory: boolean = false;
  private readonly memoryStore = new Map<string, InMemoryItem>();

  constructor(customConfig?: RedisAdapterConfig, instanceName: string = 'Automation') {
    this.redisConfig = customConfig || config.automationRedis;
    this.instanceName = instanceName;
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;
    Logger.info(
      `[REDIS:${this.instanceName}] Connecting to Redis at ${this.redisConfig.host}:${this.redisConfig.port} (DB: ${this.redisConfig.db})...`,
    );

    try {
      this.client = new Redis({
        host: this.redisConfig.host,
        port: this.redisConfig.port,
        password: this.redisConfig.password || undefined,
        db: this.redisConfig.db,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 1500,
        enableOfflineQueue: false,
      });

      this.client.on('error', (err) => {
        Logger.debug(`[REDIS:${this.instanceName} ERROR EVENT] ${err.message}`);
      });

      await this.client.connect();
      this.isConnected = true;
      this.useInMemory = false;
      Logger.success(`[REDIS:${this.instanceName}] Connected to live Redis instance successfully.`);
    } catch (err: any) {
      this.isConnected = true;
      this.useInMemory = true;
      if (this.client) {
        try {
          this.client.disconnect();
        } catch {
          // ignore cleanup error
        }
        this.client = null;
      }
      Logger.warn(
        `[REDIS:${this.instanceName}] Connection at ${this.redisConfig.host}:${this.redisConfig.port} unavailable (${err.message}). Using in-memory fallback store for resilience.`,
      );
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) return;
    Logger.info(`[REDIS:${this.instanceName}] Closing connection...`);
    if (this.client && !this.useInMemory) {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      }
      this.client = null;
    }
    this.isConnected = false;
    Logger.success(`[REDIS:${this.instanceName}] Disconnected.`);
  }

  async get(key: string): Promise<string | null> {
    Logger.debug(`[REDIS:${this.instanceName} GET] key: ${key}`);
    if (this.client && !this.useInMemory) {
      try {
        return await this.client.get(key);
      } catch {
        // Fall back to memoryStore if network drops
      }
    }

    const item = this.memoryStore.get(key);
    if (!item) return null;

    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }

    return item.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    Logger.step(
      `[REDIS:${this.instanceName} SET] key: ${key} | ttl: ${ttlSeconds ? `${ttlSeconds}s` : 'no expiry'}`,
    );
    if (this.client && !this.useInMemory) {
      try {
        if (ttlSeconds && ttlSeconds > 0) {
          await this.client.set(key, value, 'EX', ttlSeconds);
        } else {
          await this.client.set(key, value);
        }
        return;
      } catch {
        // Fall back to memoryStore
      }
    }

    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.memoryStore.set(key, { value, expiresAt });
  }

  async del(key: string | string[]): Promise<number> {
    const keys = Array.isArray(key) ? key : [key];
    Logger.step(`[REDIS:${this.instanceName} DEL] keys: ${keys.join(', ')}`);
    if (this.client && !this.useInMemory) {
      try {
        return await this.client.del(...keys);
      } catch {
        // Fall back to memoryStore
      }
    }

    let deletedCount = 0;
    for (const k of keys) {
      if (this.memoryStore.delete(k)) {
        deletedCount++;
      }
    }
    return deletedCount;
  }

  async exists(key: string): Promise<boolean> {
    if (this.client && !this.useInMemory) {
      try {
        const count = await this.client.exists(key);
        return count > 0;
      } catch {
        // Fall back to memoryStore
      }
    }

    const val = await this.get(key);
    return val !== null;
  }

  async getJson<T = any>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as any;
    }
  }

  async setJson(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    await this.set(key, serialized, ttlSeconds);
  }

  async flushDb(): Promise<void> {
    Logger.step(`[REDIS:${this.instanceName} FLUSHDB] Clearing test keys`);
    if (this.client && !this.useInMemory) {
      try {
        await this.client.flushdb();
        return;
      } catch {
        // Fall back to memoryStore
      }
    }
    this.memoryStore.clear();
  }

  // ============================================================================
  // QA-SPECIFIC CONVENIENCE METHODS
  // ============================================================================

  /**
   * Retrieves an OTP or verification code commonly cached as `otp:<phone/email>`
   */
  async getOtp(identifier: string): Promise<string | null> {
    const possibleKeys = [
      `otp:${identifier}`,
      `verification_code:${identifier}`,
      `auth:otp:${identifier}`,
    ];

    for (const key of possibleKeys) {
      const code = await this.get(key);
      if (code) {
        Logger.success(
          `[REDIS:${this.instanceName}] Found OTP for ${identifier} in key "${key}": ${code}`,
        );
        return code;
      }
    }

    Logger.warn(`[REDIS:${this.instanceName}] No OTP found for identifier: ${identifier}`);
    return null;
  }

  /**
   * Clears rate limit counters for an IP or User ID before running tests
   */
  async clearRateLimit(identifier: string): Promise<void> {
    const pattern = `ratelimit:${identifier}`;
    await this.del(pattern);
    Logger.success(`[REDIS:${this.instanceName}] Rate limit cleared for: ${identifier}`);
  }

  /**
   * Caches an authenticated session or token payload in Redis
   */
  async setSession(sessionId: string, sessionData: any, ttlSeconds: number = 3600): Promise<void> {
    const key = `session:${sessionId}`;
    Logger.step(
      `[REDIS:${this.instanceName} AUTH] Caching session "${sessionId}" with TTL ${ttlSeconds}s`,
    );
    await this.setJson(key, sessionData, ttlSeconds);
  }

  /**
   * Retrieves a cached session or token payload from Redis
   */
  async getSession<T = any>(sessionId: string): Promise<T | null> {
    const key = `session:${sessionId}`;
    Logger.debug(`[REDIS:${this.instanceName} AUTH] Fetching session "${sessionId}"`);
    return this.getJson<T>(key);
  }

  /**
   * Invalidates / deletes a session from Redis
   */
  async invalidateSession(sessionId: string): Promise<boolean> {
    const key = `session:${sessionId}`;
    Logger.step(`[REDIS:${this.instanceName} AUTH] Invalidating session "${sessionId}"`);
    const count = await this.del(key);
    return count > 0;
  }
}

export default RedisCacheAdapter;
