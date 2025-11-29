import { CacheEntry, CacheConfig } from '../types';
import { APP_CONSTANTS } from '../constants';
import { Logger, LogLevel } from '../utils/logger';
import { errorHandler, SystemError } from '../utils/error_handler';
import { MetricsService, getMetricsService } from './metrics_service';
import { generateCacheKey } from '../utils/hash';
import { compressForCache, decompressFromCache, shouldCompress } from '../utils/compression';

/**
 * Cache Service
 * Handles caching of RPC responses and configuration data
 */
export class CacheService {
  private cache: KVNamespace;
  private logger: Logger;
  private metricsService: MetricsService;
  private config: CacheConfig;

  constructor(cache: KVNamespace, config?: Partial<CacheConfig>) {
    this.cache = cache;
    this.logger = Logger.getInstance(LogLevel.INFO, { service: 'cache' });
    this.metricsService = getMetricsService(this.logger);
    this.config = {
      defaultTTL: config?.defaultTTL || APP_CONSTANTS.CACHE.DEFAULT_TTL,
      maxSize: config?.maxSize || APP_CONSTANTS.CACHE.MAX_SIZE,
      keyPrefix: config?.keyPrefix || APP_CONSTANTS.CACHE.KEY_PREFIX,
      cleanupInterval: config?.cleanupInterval || 3600, // Default 1 hour
      ...config
    };
  }

  /**
   * Generate cache key with prefix
   * Uses simple concatenation for already-hashed keys
   */
  private generateKey(key: string): string {
    return `${this.config.keyPrefix}:${key}`;
  }

  /**
   * Set cache entry with optional compression
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const startTime = Date.now();
    try {
      const cacheKey = this.generateKey(key);
      const entry: CacheEntry<T> = {
        data: value,
        timestamp: Date.now(),
        ttl: ttl || this.config.defaultTTL
      };

      const expirationTtl = ttl || this.config.defaultTTL;
      const serialized = JSON.stringify(entry);

      // Compress if data is large enough
      let dataToStore = serialized;
      let compressed = false;

      if (shouldCompress(serialized)) {
        try {
          dataToStore = await compressForCache(serialized);
          compressed = true;
          this.logger.debug('Cache entry compressed', {
            key: cacheKey,
            originalSize: serialized.length,
            compressedSize: dataToStore.length,
            ratio: (dataToStore.length / serialized.length * 100).toFixed(1) + '%'
          });
        } catch (compressionError) {
          // Fall back to uncompressed if compression fails
          this.logger.warn('Compression failed, storing uncompressed', { key: cacheKey });
        }
      }

      await this.cache.put(cacheKey, dataToStore, {
        expirationTtl,
        metadata: { compressed }
      });

      const duration = Date.now() - startTime;
      this.logger.logCacheOperation('set', key, 'cache-service', duration);
      this.logger.debug('Cache entry set', { key: cacheKey, ttl: expirationTtl, compressed });

      // Record cache metrics
      this.metricsService.recordPerformance('cache-set', duration, true, 'cache-service', {
        key,
        ttl: expirationTtl,
        compressed,
        size: dataToStore.length
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logCacheOperation('set', key, 'cache-service', duration);

      this.logger.error('Failed to set cache entry', { key, error });

      // Record error metrics
      this.metricsService.recordPerformance('cache-set', duration, false, 'cache-service', { key, error: error instanceof Error ? error.message : 'Unknown error' });
      this.metricsService.recordError('CacheSetError', 'cache-service', undefined, error instanceof Error ? error.message : 'Unknown error', { key });

      const systemError = new SystemError(`Failed to set cache entry: ${key}`);
      errorHandler.handleError(systemError);
    }
  }

  /**
   * Get cache entry with automatic decompression
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    try {
      const cacheKey = this.generateKey(key);
      const result = await this.cache.getWithMetadata(cacheKey);

      if (!result.value) {
        const duration = Date.now() - startTime;
        this.logger.logCacheOperation('miss', key, 'cache-service', duration);
        this.logger.debug('Cache miss', { key: cacheKey });

        // Record cache miss metrics
        this.metricsService.recordPerformance('cache-get', duration, false, 'cache-service', { key, result: 'miss' });
        return null;
      }

      let cached = result.value;
      const metadata = result.metadata as { compressed?: boolean } | null;

      // Decompress if needed
      if (metadata?.compressed) {
        try {
          cached = await decompressFromCache(cached);
          this.logger.debug('Cache entry decompressed', { key: cacheKey });
        } catch (decompressionError) {
          this.logger.error('Decompression failed', { key: cacheKey, error: decompressionError });
          return null;
        }
      }

      const entry: CacheEntry<T> = JSON.parse(cached);

      // Check if entry is expired (additional check)
      const now = Date.now();
      if (entry.timestamp + (entry.ttl * 1000) < now) {
        const duration = Date.now() - startTime;
        this.logger.logCacheOperation('miss', key, 'cache-service', duration);
        this.logger.debug('Cache entry expired', { key: cacheKey });

        // Record expired entry metrics
        this.metricsService.recordPerformance('cache-get', duration, false, 'cache-service', { key, result: 'expired' });
        await this.delete(key);
        return null;
      }

      const duration = Date.now() - startTime;
      this.logger.logCacheOperation('hit', key, 'cache-service', duration);
      this.logger.debug('Cache hit', { key: cacheKey });

      // Record cache hit metrics
      this.metricsService.recordPerformance('cache-get', duration, true, 'cache-service', {
        key,
        result: 'hit',
        compressed: metadata?.compressed || false
      });
      return entry.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logCacheOperation('miss', key, 'cache-service', duration);

      this.logger.error('Failed to get cache entry', { key, error });
      const systemError = new SystemError(`Failed to get cache entry: ${key}`);
      errorHandler.handleError(systemError);
      return null;
    }
  }

  /**
   * Delete cache entry
   */
  async delete(key: string): Promise<void> {
    const startTime = Date.now();
    try {
      const cacheKey = this.generateKey(key);
      await this.cache.delete(cacheKey);

      const duration = Date.now() - startTime;
      this.logger.logCacheOperation('delete', key, 'cache-service', duration);
      this.logger.debug('Cache entry deleted', { key: cacheKey });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logCacheOperation('delete', key, 'cache-service', duration);

      const systemError = new SystemError('Failed to delete cache entry', 'cache-service');
      errorHandler.handleError(systemError);
      this.logger.error('Failed to delete cache entry', { key, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Clear all cache entries with prefix
   */
  async clear(): Promise<void> {
    try {
      // Note: KV doesn't support bulk delete, so we'd need to track keys
      // For now, we'll just log the operation
      this.logger.info('Cache clear requested', { prefix: this.config.keyPrefix });
    } catch (error) {
      this.logger.error('Failed to clear cache', { error });
      const systemError = new SystemError('Failed to clear cache');
      errorHandler.handleError(systemError);
    }
  }

  /**
   * Cache RPC response with optimized key generation
   */
  async cacheRPCResponse(chainId: string, method: string, params: any[], response: any): Promise<void> {
    // Only cache certain methods that are safe to cache
    const cacheableMethods = [
      'eth_blockNumber',
      'eth_getBalance',
      'eth_getBlockByNumber',
      'eth_getBlockByHash',
      'eth_getTransactionByHash',
      'eth_getTransactionReceipt',
      'eth_call',
      'eth_estimateGas'
    ];

    if (!cacheableMethods.includes(method)) {
      return;
    }

    // Use optimized cache key generation
    const cacheKey = `rpc:${generateCacheKey(chainId, method, params)}`;
    const ttl = this.getRPCCacheTTL(method);

    await this.set(cacheKey, response, ttl);
  }

  /**
   * Get cached RPC response with optimized key generation
   */
  async getCachedRPCResponse(chainId: string, method: string, params: any[]): Promise<any | null> {
    // Use optimized cache key generation
    const cacheKey = `rpc:${generateCacheKey(chainId, method, params)}`;
    return await this.get(cacheKey);
  }

  /**
   * Cache chain configuration
   */
  async cacheChainConfig(chainId: string, config: any): Promise<void> {
    const cacheKey = `config:chain:${chainId}`;
    await this.set(cacheKey, config, APP_CONSTANTS.CACHE.CONFIG_TTL);
  }

  /**
   * Get cached chain configuration
   */
  async getCachedChainConfig(chainId: string): Promise<any | null> {
    const cacheKey = `config:chain:${chainId}`;
    return await this.get(cacheKey);
  }

  /**
   * Cache health check results
   */
  async cacheHealthCheck(endpoint: string, result: any): Promise<void> {
    const cacheKey = `health:${endpoint}`;
    await this.set(cacheKey, result, APP_CONSTANTS.CACHE.HEALTH_TTL);
  }

  /**
   * Get cached health check result
   */
  async getCachedHealthCheck(endpoint: string): Promise<any | null> {
    const cacheKey = `health:${endpoint}`;
    return await this.get(cacheKey);
  }

  /**
   * Get appropriate TTL for RPC method
   */
  private getRPCCacheTTL(method: string): number {
    const ttlMap: Record<string, number> = {
      'eth_blockNumber': 5, // 5 seconds for latest block
      'eth_getBalance': 30, // 30 seconds for balance
      'eth_getBlockByNumber': 300, // 5 minutes for historical blocks
      'eth_getBlockByHash': 3600, // 1 hour for blocks by hash
      'eth_getTransactionByHash': 3600, // 1 hour for transactions
      'eth_getTransactionReceipt': 3600, // 1 hour for receipts
      'eth_call': 60, // 1 minute for contract calls
      'eth_estimateGas': 30 // 30 seconds for gas estimates
    };

    return ttlMap[method] || APP_CONSTANTS.CACHE.DEFAULT_TTL;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ hits: number; misses: number; size: number }> {
    // This would require additional tracking in a real implementation
    return {
      hits: 0,
      misses: 0,
      size: 0
    };
  }
}