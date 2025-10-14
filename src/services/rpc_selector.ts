import { RPCEndpoint, ChainConfig } from '../types';

export class RPCSelector {
  /**
   * Select a random RPC endpoint from available healthy endpoints
   * Uses weighted random selection based on priority
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

    // Use weighted random selection based on priority
    return this.weightedRandomSelection(activeRPCs);
  }

  /**
   * Weighted random selection based on RPC priority
   * Higher priority RPCs have higher chance of being selected
   */
  private static weightedRandomSelection(rpcs: RPCEndpoint[]): RPCEndpoint {
    // Calculate total weight (sum of all priorities)
    const totalWeight = rpcs.reduce((sum, rpc) => sum + rpc.priority, 0);
    
    // Generate random number between 0 and totalWeight
    let random = Math.random() * totalWeight;
    
    // Find the RPC that corresponds to this random value
    for (const rpc of rpcs) {
      random -= rpc.priority;
      if (random <= 0) {
        return rpc;
      }
    }
    
    // Fallback to last RPC (should not happen)
    return rpcs[rpcs.length - 1];
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
}