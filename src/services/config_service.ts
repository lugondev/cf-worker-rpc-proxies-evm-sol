import { Env, RPCConfig, ChainConfig, RPCEndpoint } from '../types';
import { DEFAULT_RPC_CONFIG } from '../config/default_config';
import { errorHandler, SystemError, ConfigurationError } from '../utils/error_handler';

export class ConfigService {
  private env: Env;
  private readonly CONFIG_KEY = 'rpc_config';

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Get the current RPC configuration from KV storage
   * If no config exists, return the default configuration
   */
  async getConfig(): Promise<RPCConfig> {
    try {
      const configData = await this.env.RPC_CONFIG.get(this.CONFIG_KEY);
      
      if (!configData) {
        // Initialize with default config if none exists
        await this.saveConfig(DEFAULT_RPC_CONFIG);
        return DEFAULT_RPC_CONFIG;
      }

      return JSON.parse(configData) as RPCConfig;
    } catch (error) {
      console.error('Error loading RPC config:', error);
      const configError = new ConfigurationError('Failed to load RPC configuration');
      errorHandler.handleError(configError);
      return DEFAULT_RPC_CONFIG;
    }
  }

  /**
   * Save RPC configuration to KV storage
   */
  async saveConfig(config: RPCConfig): Promise<void> {
    try {
      await this.env.RPC_CONFIG.put(this.CONFIG_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Error saving RPC config:', error);
      const configError = new ConfigurationError('Failed to save configuration');
      const handledError = errorHandler.handleError(configError);
      throw handledError;
    }
  }

  /**
   * Get configuration for a specific chain
   */
  async getChainConfig(chainId: number): Promise<ChainConfig | null> {
    const config = await this.getConfig();
    return config.chains[chainId.toString()] || null;
  }

  /**
   * Add or update a chain configuration
   */
  async updateChainConfig(chainId: number, chainConfig: ChainConfig): Promise<void> {
    const config = await this.getConfig();
    config.chains[chainId.toString()] = chainConfig;
    await this.saveConfig(config);
  }

  /**
   * Remove a chain configuration
   */
  async removeChainConfig(chainId: number): Promise<void> {
    const config = await this.getConfig();
    delete config.chains[chainId.toString()];
    await this.saveConfig(config);
  }

  /**
   * Add RPC endpoint to a specific chain
   */
  async addRPCEndpoint(chainId: number, rpcEndpoint: RPCEndpoint): Promise<void> {
    const config = await this.getConfig();
    const chainConfig = config.chains[chainId.toString()];
    
    if (!chainConfig) {
      throw new Error(`Chain ${chainId} not found`);
    }

    chainConfig.rpcs.push(rpcEndpoint);
    await this.saveConfig(config);
  }

  /**
   * Remove RPC endpoint from a specific chain
   */
  async removeRPCEndpoint(chainId: number, rpcUrl: string): Promise<void> {
    const config = await this.getConfig();
    const chainConfig = config.chains[chainId.toString()];
    
    if (!chainConfig) {
      throw new Error(`Chain ${chainId} not found`);
    }

    chainConfig.rpcs = chainConfig.rpcs.filter(rpc => rpc.url !== rpcUrl);
    await this.saveConfig(config);
  }

  /**
   * Update RPC endpoint status (active/inactive)
   */
  async updateRPCStatus(chainId: number, rpcUrl: string, isActive: boolean): Promise<void> {
    const config = await this.getConfig();
    const chainConfig = config.chains[chainId.toString()];
    
    if (!chainConfig) {
      throw new Error(`Chain ${chainId} not found`);
    }

    const rpcEndpoint = chainConfig.rpcs.find(rpc => rpc.url === rpcUrl);
    if (!rpcEndpoint) {
      throw new Error(`RPC endpoint ${rpcUrl} not found for chain ${chainId}`);
    }

    rpcEndpoint.isActive = isActive;
    await this.saveConfig(config);
  }

  /**
   * Get all available chain IDs
   */
  async getAvailableChains(): Promise<number[]> {
    const config = await this.getConfig();
    return Object.keys(config.chains).map(chainId => parseInt(chainId));
  }

  /**
   * Reset configuration to default
   */
  async resetToDefault(): Promise<void> {
    await this.saveConfig(DEFAULT_RPC_CONFIG);
  }
}