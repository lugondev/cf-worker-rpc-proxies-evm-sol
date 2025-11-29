import { Env, HealthCheckResult, RPCEndpoint, ChainConfig, HealthSummary } from '../types';
import { ConfigService } from './config_service';

export class HealthService {
  private env: Env;
  private configService: ConfigService;

  constructor(env: Env) {
    this.env = env;
    this.configService = new ConfigService(env);
  }

  /**
   * Check health of a specific RPC endpoint
   */
  async checkRPCHealth(chainId: number | string, rpcEndpoint: RPCEndpoint): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Create a simple eth_blockNumber request to test the RPC
      const testRequest = {
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), rpcEndpoint.timeout);

      const response = await fetch(rpcEndpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'RPC-EVM-Proxy-Health/1.0'
        },
        body: JSON.stringify(testRequest),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        return {
          url: rpcEndpoint.url,
          chainId,
          isHealthy: false,
          responseTime,
          lastChecked: Date.now(),
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const result = await response.json() as any;

      // Check if response contains valid block number
      if (result.error) {
        return {
          url: rpcEndpoint.url,
          chainId,
          isHealthy: false,
          responseTime,
          lastChecked: Date.now(),
          error: `RPC Error: ${result.error.message}`
        };
      }

      // Parse block number
      let blockNumber: number | undefined;
      if (result.result && typeof result.result === 'string') {
        blockNumber = parseInt(result.result, 16);
      }

      return {
        url: rpcEndpoint.url,
        chainId,
        isHealthy: true,
        responseTime,
        lastChecked: Date.now(),
        blockNumber
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        url: rpcEndpoint.url,
        chainId,
        isHealthy: false,
        responseTime,
        lastChecked: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Perform health check on all RPCs for a specific chain
   */
  async checkChainHealth(chainId: number | string): Promise<HealthCheckResult[]> {
    const chainConfig = await this.configService.getChainConfig(chainId);
    if (!chainConfig) {
      throw new Error(`Chain ${chainId} not found`);
    }

    const healthChecks = chainConfig.rpcs.map(rpc =>
      this.checkRPCHealth(chainId, rpc)
    );

    return Promise.all(healthChecks);
  }

  /**
   * Perform health check on all configured chains and RPCs
   * Uses parallel execution with concurrency control
   */
  async checkAllHealth(): Promise<HealthCheckResult[]> {
    const config = await this.configService.getConfig();
    const allHealthChecks: Promise<HealthCheckResult>[] = [];

    // Collect all RPC health checks
    for (const chainIdStr of Object.keys(config.chains)) {
      const parsed = parseInt(chainIdStr, 10);
      const chainId = isNaN(parsed) ? chainIdStr : parsed;
      const chainConfig = config.chains[chainIdStr];

      // Add individual RPC checks instead of chain-level checks
      for (const rpc of chainConfig.rpcs) {
        allHealthChecks.push(this.checkRPCHealth(chainId, rpc));
      }
    }

    // Execute all checks in parallel with concurrency control
    const results = await this.executeWithConcurrency(allHealthChecks, 10);
    return results;
  }

  /**
   * Execute promises with concurrency limit
   * Prevents overwhelming the worker with too many concurrent requests
   */
  private async executeWithConcurrency<T>(
    promises: Promise<T>[],
    concurrency: number
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const promise of promises) {
      const p = promise.then(result => {
        results.push(result);
      });

      executing.push(p);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
        // Remove completed promises
        const completed = executing.filter(p => {
          // Check if promise is settled
          return Promise.race([p, Promise.resolve()]).then(() => true);
        });
        executing.splice(0, executing.length, ...completed);
      }
    }

    // Wait for remaining promises
    await Promise.all(executing);
    return results;
  }

  /**
   * Save health check results to KV storage
   */
  async saveHealthResults(results: HealthCheckResult[]): Promise<void> {
    const healthData = {
      timestamp: Date.now(),
      results: results.reduce((acc, result) => {
        const key = `${result.chainId}_${result.url}`;
        acc[key] = result;
        return acc;
      }, {} as Record<string, HealthCheckResult>)
    };

    await this.env.RPC_HEALTH.put('health_results', JSON.stringify(healthData));
  }

  /**
   * Get latest health check results from KV storage
   */
  async getHealthResults(): Promise<HealthCheckResult[]> {
    try {
      const healthData = await this.env.RPC_HEALTH.get('health_results');
      if (!healthData) {
        return [];
      }

      const parsed = JSON.parse(healthData);
      return Object.values(parsed.results) as HealthCheckResult[];
    } catch (error) {
      console.error('Error loading health results:', error);
      return [];
    }
  }

  /**
   * Update RPC endpoint status based on health check results
   */
  async updateRPCStatus(results: HealthCheckResult[]): Promise<void> {
    for (const result of results) {
      try {
        // Update RPC status in configuration
        await this.configService.updateRPCStatus(
          result.chainId,
          result.url,
          result.isHealthy
        );
      } catch (error) {
        console.warn(`Failed to update RPC status for ${result.url}:`, error);
      }
    }
  }

  /**
   * Get health summary for all chains
   */
  async getHealthSummary(): Promise<HealthSummary> {
    const results = await this.getHealthResults();
    const config = await this.configService.getConfig();

    const summary: HealthSummary = {
      totalChains: Object.keys(config.chains).length,
      totalRPCs: 0,
      healthyRPCs: 0,
      unhealthyRPCs: 0,
      lastUpdated: 0,
      chains: {}
    };

    // Group results by chain
    const chainResults = results.reduce((acc, result) => {
      const key = String(result.chainId);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(result);
      return acc;
    }, {} as Record<string, HealthCheckResult[]>);

    // Calculate summary for each chain
    for (const [chainIdStr, chainConfig] of Object.entries(config.chains)) {
      const parsed = parseInt(chainIdStr, 10);
      const chainId = isNaN(parsed) ? chainIdStr : parsed;
      const chainHealthResults = chainResults[chainIdStr] || [];

      const healthyCount = chainHealthResults.filter(r => r.isHealthy).length;
      const totalCount = chainHealthResults.length;
      const avgResponseTime = totalCount > 0
        ? chainHealthResults.reduce((sum, r) => sum + r.responseTime, 0) / totalCount
        : 0;

      summary.chains[chainIdStr] = {
        chainId,
        name: chainConfig.name,
        totalRPCs: totalCount,
        healthyRPCs: healthyCount,
        avgResponseTime: Math.round(avgResponseTime)
      };

      summary.totalRPCs += totalCount;
      summary.healthyRPCs += healthyCount;
    }

    summary.unhealthyRPCs = summary.totalRPCs - summary.healthyRPCs;
    summary.lastUpdated = results.length > 0
      ? Math.max(...results.map(r => r.lastChecked))
      : 0;

    return summary;
  }

  /**
   * Run periodic health check (to be called by scheduled events)
   */
  async runPeriodicHealthCheck(): Promise<void> {
    try {
      console.log('Starting periodic health check...');

      const results = await this.checkAllHealth();
      await this.saveHealthResults(results);
      await this.updateRPCStatus(results);

      console.log(`Health check completed. Checked ${results.length} RPCs.`);

      // Log summary
      const healthyCount = results.filter(r => r.isHealthy).length;
      const unhealthyCount = results.length - healthyCount;
      console.log(`Healthy: ${healthyCount}, Unhealthy: ${unhealthyCount}`);

    } catch (error) {
      console.error('Periodic health check failed:', error);
    }
  }
}