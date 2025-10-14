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
   * Get chain configuration by ID
   */
  async getChainConfig(chainId: number | string): Promise<ChainConfig | null> {
    const config = await this.getConfig();
    return config.chains[chainId] || null;
  }

  /**
   * Update chain configuration
   */
  async updateChainConfig(chainId: number | string, chainConfig: ChainConfig): Promise<void> {
    const config = await this.getConfig();
    config.chains[chainId] = chainConfig;
    await this.saveConfig(config);
  }

  /**
   * Remove chain configuration
   */
  async removeChainConfig(chainId: number | string): Promise<void> {
    const config = await this.getConfig();
    delete config.chains[chainId];
    await this.saveConfig(config);
  }

  /**
   * Add RPC endpoint to a chain
   */
  async addRPCEndpoint(chainId: number | string, rpcEndpoint: RPCEndpoint): Promise<void> {
    const config = await this.getConfig();
    const chain = config.chains[chainId];
    if (!chain) {
      throw new ConfigurationError(`Chain ${chainId} not found`);
    }
    chain.rpcs.push(rpcEndpoint);
    await this.saveConfig(config);
  }

  /**
   * Remove RPC endpoint from a chain
   */
  async removeRPCEndpoint(chainId: number | string, rpcUrl: string): Promise<void> {
    const config = await this.getConfig();
    const chain = config.chains[chainId];
    if (!chain) {
      throw new ConfigurationError(`Chain ${chainId} not found`);
    }
    
    const rpcIndex = chain.rpcs.findIndex(rpc => rpc.url === rpcUrl);
    if (rpcIndex === -1) {
      throw new ConfigurationError(`RPC endpoint ${rpcUrl} not found in chain ${chainId}`);
    }
    
    chain.rpcs.splice(rpcIndex, 1);
    await this.saveConfig(config);
  }

  /**
   * Update RPC endpoint status
   */
  async updateRPCStatus(chainId: number | string, rpcUrl: string, isActive: boolean): Promise<void> {
    const config = await this.getConfig();
    const chainConfig = config.chains[chainId];
    
    if (!chainConfig) {
      throw new ConfigurationError(`Chain ${chainId} not found`);
    }

    const rpc = chainConfig.rpcs.find(r => r.url === rpcUrl);
    if (!rpc) {
      throw new ConfigurationError(`RPC endpoint ${rpcUrl} not found in chain ${chainId}`);
    }

    rpc.isActive = isActive;
    await this.saveConfig(config);
  }

  /**
   * Get all available chain IDs
   */
  async getAvailableChains(): Promise<(number | string)[]> {
    const config = await this.getConfig();
    return Object.keys(config.chains).map(chainId => {
      const parsed = parseInt(chainId, 10);
      return isNaN(parsed) ? chainId : parsed;
    });
  }

  /**
   * Reset configuration to default
   */
  async resetToDefault(): Promise<void> {
    await this.saveConfig(DEFAULT_RPC_CONFIG);
  }
}