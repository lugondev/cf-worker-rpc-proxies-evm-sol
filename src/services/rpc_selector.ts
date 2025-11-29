import { RPCEndpoint, ChainConfig } from '../types';

/**
 * Enhanced RPC selector with performance tracking
 */
export class RPCSelector {
  // Track response times for dynamic selection
  private static responseTimesMap: Map<string, number[]> = new Map();
  private static readonly MAX_RESPONSE_SAMPLES = 10;

  /**
   * Select a random RPC endpoint from available healthy endpoints
   * Uses weighted random selection based on priority and response time
   */
  static selectRPC(chainConfig: ChainConfig): RPCEndpoint | null {
    // Filter only active RPCs
    const activeRPCs = chainConfig.rpcs.filter(rpc => rpc.isActive);

    if (activeRPCs.length === 0) {
      return null;
    }

    // If only one RPC is available, return it
    if (activeRPCs.length === 1) {
      return activeRPCs[0];
    }

    // Use weighted random selection based on priority and performance
    return this.weightedRandomSelection(activeRPCs);
  }

  /**
   * Weighted random selection based on RPC priority and response time
   * Higher priority and faster RPCs have higher chance of being selected
   */
  private static weightedRandomSelection(rpcs: RPCEndpoint[]): RPCEndpoint {
    // Pre-compute weights for all RPCs
    const weights: number[] = [];
    let totalWeight = 0;

    for (const rpc of rpcs) {
      // Base weight from priority
      let weight = rpc.priority;

      // Adjust weight based on average response time
      const avgResponseTime = this.getAverageResponseTime(rpc.url);
      if (avgResponseTime > 0) {
        // Faster RPCs get higher weight
        // Normalize: 100ms = 1.0x, 500ms = 0.5x, 1000ms = 0.25x
        const performanceFactor = Math.max(0.1, 100 / avgResponseTime);
        weight *= performanceFactor;
      }

      weights.push(weight);
      totalWeight += weight;
    }

    // Generate random number between 0 and totalWeight
    let random = Math.random() * totalWeight;

    // Find the RPC that corresponds to this random value
    for (let i = 0; i < rpcs.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return rpcs[i];
      }
    }

    // Fallback to last RPC (should not happen)
    return rpcs[rpcs.length - 1];
  }

  /**
   * Record response time for an RPC endpoint
   */
  static recordResponseTime(rpcUrl: string, responseTime: number): void {
    let times = this.responseTimesMap.get(rpcUrl);

    if (!times) {
      times = [];
      this.responseTimesMap.set(rpcUrl, times);
    }

    times.push(responseTime);

    // Keep only the last N samples
    if (times.length > this.MAX_RESPONSE_SAMPLES) {
      times.shift();
    }
  }

  /**
   * Get average response time for an RPC endpoint
   */
  static getAverageResponseTime(rpcUrl: string): number {
    const times = this.responseTimesMap.get(rpcUrl);

    if (!times || times.length === 0) {
      return 0;
    }

    const sum = times.reduce((acc, time) => acc + time, 0);
    return sum / times.length;
  }

  /**
   * Clear response time tracking for an RPC
   */
  static clearResponseTimes(rpcUrl: string): void {
    this.responseTimesMap.delete(rpcUrl);
  }

  /**
   * Get next available RPC for failover
   * Excludes the failed RPC from selection
   */
  static getFailoverRPC(chainConfig: ChainConfig, failedRPCUrl: string): RPCEndpoint | null {
    const availableRPCs = chainConfig.rpcs.filter(
      rpc => rpc.isActive && rpc.url !== failedRPCUrl
    );

    if (availableRPCs.length === 0) {
      return null;
    }

    return this.weightedRandomSelection(availableRPCs);
  }

  /**
   * Get all healthy RPCs for a chain
   */
  static getHealthyRPCs(chainConfig: ChainConfig): RPCEndpoint[] {
    return chainConfig.rpcs.filter(rpc => rpc.isActive);
  }

  /**
   * Check if chain has any healthy RPCs available
   */
  static hasHealthyRPCs(chainConfig: ChainConfig): boolean {
    return chainConfig.rpcs.some(rpc => rpc.isActive);
  }

  /**
   * Get performance stats for all tracked RPCs
   */
  static getPerformanceStats(): Map<string, { avgResponseTime: number; sampleCount: number }> {
    const stats = new Map<string, { avgResponseTime: number; sampleCount: number }>();

    for (const [url, times] of this.responseTimesMap.entries()) {
      const avgResponseTime = times.reduce((acc, time) => acc + time, 0) / times.length;
      stats.set(url, {
        avgResponseTime,
        sampleCount: times.length
      });
    }

    return stats;
  }
}