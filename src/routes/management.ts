import { Env, ManagementResponse, RPCConfig, ChainConfig, RPCEndpoint, CORSConfig } from '../types';
import { ConfigService } from '../services/config_service';
import { HealthService } from '../services/health_service';
import { Validator, ValidationError } from '../utils/validation';
import { logger } from '../utils/logger';
import { APP_CONSTANTS } from '../constants';

export class ManagementRoutes {
  private env: Env;
  private configService: ConfigService;
  private healthService: HealthService;

  constructor(env: Env) {
    this.env = env;
    this.configService = new ConfigService(env);
    this.healthService = new HealthService(env);
  }

  /**
   * Authenticate admin request
   */
  private authenticateAdmin(request: Request): boolean {
    const apiKey = request.headers.get('X-API-Key');
    try {
      Validator.validateApiKey(apiKey, this.env.ADMIN_API_KEY);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create standardized response with proper HTTP status codes
   */
  private createResponse<T>(
    success: boolean, 
    data?: T, 
    error?: string, 
    statusCode?: number
  ): Response {
    const response: ManagementResponse<T> = {
      success,
      data,
      error,
      timestamp: Date.now()
    };

    let status = statusCode;
    if (!status) {
      if (success) {
        status = APP_CONSTANTS.HTTP_STATUS.OK;
      } else if (error === 'Unauthorized') {
        status = APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED;
      } else if (error?.includes('not found')) {
        status = APP_CONSTANTS.HTTP_STATUS.NOT_FOUND;
      } else if (error?.includes('Invalid') || error?.includes('validation')) {
        status = APP_CONSTANTS.HTTP_STATUS.BAD_REQUEST;
      } else {
        status = APP_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR;
      }
    }

    return new Response(JSON.stringify(response), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  /**
   * Handle CORS preflight requests
   */
  handleOptions(): Response {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  /**
   * GET /admin/config - Get current RPC configuration
   */
  async getConfig(request: Request): Promise<Response> {
    try {
      if (!this.authenticateAdmin(request)) {
        logger.warn('Unauthorized config access attempt', { 
          ip: request.headers.get('CF-Connecting-IP'),
          userAgent: request.headers.get('User-Agent')
        });
        return this.createResponse(false, null, 'Unauthorized', APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED);
      }

      const config = await this.configService.getConfig();
      logger.info('Config retrieved successfully');
      return this.createResponse(true, config);
    } catch (error) {
      logger.error('Failed to get config', { error: error instanceof Error ? error.message : error });
      return this.createResponse(
        false, 
        null, 
        error instanceof Error ? error.message : 'Failed to retrieve configuration',
        APP_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * PUT /admin/config - Update RPC configuration
   */
  async updateConfig(request: Request): Promise<Response> {
    try {
      if (!this.authenticateAdmin(request)) {
        return this.createResponse(false, null, 'Unauthorized', APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED);
      }

      const contentType = request.headers.get('Content-Type');
      if (!contentType?.includes('application/json')) {
        return this.createResponse(
          false, 
          null, 
          'Content-Type must be application/json', 
          APP_CONSTANTS.HTTP_STATUS.BAD_REQUEST
        );
      }

      const newConfig = await request.json() as RPCConfig;
      
      // Basic validation for configuration structure
      if (!newConfig || typeof newConfig !== 'object') {
        return this.createResponse(
          false, 
          null, 
          'Invalid configuration format', 
          APP_CONSTANTS.HTTP_STATUS.BAD_REQUEST
        );
      }

      // Validate required properties
      if (!newConfig.chains || !newConfig.globalSettings) {
        return this.createResponse(
          false, 
          null, 
          'Configuration must include chains and globalSettings', 
          APP_CONSTANTS.HTTP_STATUS.BAD_REQUEST
        );
      }

      await this.configService.saveConfig(newConfig);
      logger.info('Config updated successfully');
      return this.createResponse(true, { message: 'Configuration updated successfully' });
    } catch (error) {
      if (error instanceof ValidationError) {
        return this.createResponse(false, null, error.message, APP_CONSTANTS.HTTP_STATUS.BAD_REQUEST);
      }
      
      logger.error('Failed to update config', { error: error instanceof Error ? error.message : error });
      return this.createResponse(
        false, 
        null, 
        error instanceof Error ? error.message : 'Failed to update configuration',
        APP_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * GET /admin/cors - Get current CORS configuration
   */
  async getCORSConfig(request: Request): Promise<Response> {
    try {
      if (!this.authenticateAdmin(request)) {
        return this.createResponse(false, null, 'Unauthorized', APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED);
      }

      const config = await this.configService.getConfig();
      return this.createResponse(true, config.cors);
    } catch (error) {
      logger.error('Failed to get CORS config', { error: error instanceof Error ? error.message : error });
      return this.createResponse(
        false, 
        null, 
        error instanceof Error ? error.message : 'Failed to get CORS configuration',
        APP_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * PUT /admin/cors - Update CORS configuration
   */
  async updateCORSConfig(request: Request): Promise<Response> {
    try {
      if (!this.authenticateAdmin(request)) {
        return this.createResponse(false, null, 'Unauthorized', APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED);
      }

      const contentType = request.headers.get('Content-Type');
      if (!contentType?.includes('application/json')) {
        return this.createResponse(
          false, 
          null, 
          'Content-Type must be application/json', 
          APP_CONSTANTS.HTTP_STATUS.BAD_REQUEST
        );
      }

      const corsConfig = await request.json() as CORSConfig;
      
      // Basic validation for CORS configuration
      if (!corsConfig || typeof corsConfig !== 'object') {
        return this.createResponse(
          false, 
          null, 
          'Invalid CORS configuration format', 
          APP_CONSTANTS.HTTP_STATUS.BAD_REQUEST
        );
      }

      // Validate required properties
      if (typeof corsConfig.enabled !== 'boolean') {
        return this.createResponse(
          false, 
          null, 
          'CORS enabled property must be a boolean', 
          APP_CONSTANTS.HTTP_STATUS.BAD_REQUEST
        );
      }

      if (!Array.isArray(corsConfig.allowedOrigins)) {
        return this.createResponse(
          false, 
          null, 
          'CORS allowedOrigins must be an array', 
          APP_CONSTANTS.HTTP_STATUS.BAD_REQUEST
        );
      }

      // Get current config and update only CORS part
      const currentConfig = await this.configService.getConfig();
      currentConfig.cors = corsConfig;
      
      await this.configService.saveConfig(currentConfig);
      logger.info('CORS config updated successfully', { corsConfig });
      return this.createResponse(true, { message: 'CORS configuration updated successfully', cors: corsConfig });
    } catch (error) {
      if (error instanceof ValidationError) {
        return this.createResponse(false, null, error.message, APP_CONSTANTS.HTTP_STATUS.BAD_REQUEST);
      }
      
      logger.error('Failed to update CORS config', { error: error instanceof Error ? error.message : error });
      return this.createResponse(
        false, 
        null, 
        error instanceof Error ? error.message : 'Failed to update CORS configuration',
        APP_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * GET /admin/chains - Get list of available chains
   */
  async getChains(request: Request): Promise<Response> {
    try {
      if (!this.authenticateAdmin(request)) {
        return this.createResponse(false, null, 'Unauthorized', APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED);
      }

      const chains = await this.configService.getAvailableChains();
      const config = await this.configService.getConfig();
      
      const chainDetails = chains
        .map(chainId => {
          const chainConfig = config.chains[chainId.toString()];
          
          // Skip if chain config is null or undefined
          if (!chainConfig) {
            logger.warn(`Chain config not found for chainId: ${chainId}`);
            return null;
          }

          // Validate required properties
          if (!chainConfig.name || !chainConfig.symbol || !chainConfig.rpcs) {
            logger.warn(`Invalid chain config for chainId: ${chainId}`, chainConfig);
            return null;
          }

          return {
            chainId,
            name: chainConfig.name,
            symbol: chainConfig.symbol,
            rpcCount: chainConfig.rpcs.length,
            activeRpcCount: chainConfig.rpcs.filter(rpc => rpc && rpc.isActive).length
          };
        })
        .filter(chain => chain !== null); // Remove null entries

      return this.createResponse(true, chainDetails);
    } catch (error) {
      logger.error('Error in getChains:', error);
      return this.createResponse(
        false, 
        null, 
        error instanceof Error ? error.message : 'Failed to retrieve chains',
        APP_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * GET /admin/chains/:chainId - Get specific chain configuration
   */
  async getChainConfig(request: Request, chainId: number | string): Promise<Response> {
    try {
      if (!this.authenticateAdmin(request)) {
        return this.createResponse(false, null, 'Unauthorized', APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED);
      }

      Validator.validateChainId(chainId);
      const config = await this.configService.getConfig();
      const chainConfig = config.chains[chainId.toString()];

      if (!chainConfig) {
        return this.createResponse(
          false, 
          null, 
          `Chain ${chainId} not found`, 
          APP_CONSTANTS.HTTP_STATUS.NOT_FOUND
        );
      }

      return this.createResponse(true, chainConfig);
    } catch (error) {
      if (error instanceof ValidationError) {
        return this.createResponse(false, null, error.message, APP_CONSTANTS.HTTP_STATUS.BAD_REQUEST);
      }
      
      logger.error('Failed to get chain config', { error: error instanceof Error ? error.message : error });
      return this.createResponse(
        false, 
        null, 
        error instanceof Error ? error.message : 'Failed to retrieve chain configuration',
        APP_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * PUT /admin/chains/:chainId - Update specific chain configuration
   */
  async updateChainConfig(request: Request, chainId: number | string): Promise<Response> {
    try {
      if (!this.authenticateAdmin(request)) {
        return this.createResponse(false, null, 'Unauthorized', APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED);
      }

      Validator.validateChainId(chainId);
      const chainConfig = await request.json() as ChainConfig;
      await this.configService.updateChainConfig(chainId, chainConfig);
      
      logger.info('Chain config updated successfully', { chainId });
      return this.createResponse(true, { message: `Chain ${chainId} configuration updated successfully` });
    } catch (error) {
      if (error instanceof ValidationError) {
        return this.createResponse(false, null, error.message, APP_CONSTANTS.HTTP_STATUS.BAD_REQUEST);
      }
      
      logger.error('Failed to update chain config', { error: error instanceof Error ? error.message : error });
      return this.createResponse(
        false, 
        null, 
        error instanceof Error ? error.message : 'Failed to update chain configuration',
        APP_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * DELETE /admin/chains/:chainId - Remove chain configuration
   */
  async removeChainConfig(request: Request, chainId: number | string): Promise<Response> {
    try {
      if (!this.authenticateAdmin(request)) {
        return this.createResponse(false, null, 'Unauthorized', APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED);
      }

      Validator.validateChainId(chainId);
      await this.configService.removeChainConfig(chainId);
      
      logger.info('Chain config removed successfully', { chainId });
      return this.createResponse(true, { message: `Chain ${chainId} configuration removed successfully` });
    } catch (error) {
      if (error instanceof ValidationError) {
        return this.createResponse(false, null, error.message, APP_CONSTANTS.HTTP_STATUS.BAD_REQUEST);
      }
      
      logger.error('Failed to remove chain config', { error: error instanceof Error ? error.message : error });
      return this.createResponse(
        false, 
        null, 
        error instanceof Error ? error.message : 'Failed to remove chain configuration',
        APP_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * POST /admin/chains/:chainId/rpcs - Add RPC endpoint to chain
   */
  async addRPCEndpoint(request: Request, chainId: number | string): Promise<Response> {
    try {
      if (!this.authenticateAdmin(request)) {
        return this.createResponse(false, null, 'Unauthorized', APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED);
      }

      Validator.validateChainId(chainId);
      const rpcData = await request.json() as Partial<RPCEndpoint>;
      
      if (!rpcData.url) {
        return this.createResponse(
          false, 
          null, 
          'RPC URL is required', 
          APP_CONSTANTS.HTTP_STATUS.BAD_REQUEST
        );
      }

      Validator.validateRPCUrl(rpcData.url);
      await this.configService.addRPCEndpoint(chainId, rpcData as RPCEndpoint);
      
      logger.info('RPC endpoint added successfully', { chainId, url: rpcData.url });
      return this.createResponse(true, { message: `RPC endpoint added to chain ${chainId} successfully` });
    } catch (error) {
      if (error instanceof ValidationError) {
        return this.createResponse(false, null, error.message, APP_CONSTANTS.HTTP_STATUS.BAD_REQUEST);
      }
      
      logger.error('Failed to add RPC endpoint', { error: error instanceof Error ? error.message : error });
      return this.createResponse(
        false, 
        null, 
        error instanceof Error ? error.message : 'Failed to add RPC endpoint',
        APP_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * DELETE /admin/chains/:chainId/rpcs - Remove RPC endpoint from chain
   */
  async removeRPCEndpoint(request: Request, chainId: number | string): Promise<Response> {
    try {
      if (!this.authenticateAdmin(request)) {
        return this.createResponse(false, null, 'Unauthorized', APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED);
      }

      const url = new URL(request.url);
      const rpcUrl = url.searchParams.get('url');
      
      if (!rpcUrl) {
        return this.createResponse(
          false, 
          null, 
          'RPC URL parameter is required', 
          APP_CONSTANTS.HTTP_STATUS.BAD_REQUEST
        );
      }

      Validator.validateChainId(chainId);
      Validator.validateRPCUrl(rpcUrl);
      await this.configService.removeRPCEndpoint(chainId, rpcUrl);
      
      logger.info('RPC endpoint removed successfully', { chainId, url: rpcUrl });
      return this.createResponse(true, { message: `RPC endpoint removed from chain ${chainId} successfully` });
    } catch (error) {
      if (error instanceof ValidationError) {
        return this.createResponse(false, null, error.message, APP_CONSTANTS.HTTP_STATUS.BAD_REQUEST);
      }
      
      logger.error('Failed to remove RPC endpoint', { error: error instanceof Error ? error.message : error });
      return this.createResponse(
        false, 
        null, 
        error instanceof Error ? error.message : 'Failed to remove RPC endpoint',
        APP_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * GET /admin/health - Get overall health status
   */
  async getHealthStatus(request: Request): Promise<Response> {
    try {
      if (!this.authenticateAdmin(request)) {
        return this.createResponse(false, null, 'Unauthorized', APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED);
      }

      const healthResults = await this.healthService.checkAllHealth();
      return this.createResponse(true, healthResults);
    } catch (error) {
      logger.error('Failed to get health status', { error: error instanceof Error ? error.message : error });
      return this.createResponse(
        false, 
        null, 
        error instanceof Error ? error.message : 'Failed to retrieve health status',
        APP_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * GET /admin/health/:chainId - Get health status for specific chain
   */
  async getChainHealth(request: Request, chainId: number | string): Promise<Response> {
    try {
      if (!this.authenticateAdmin(request)) {
        return this.createResponse(false, null, 'Unauthorized', APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED);
      }

      Validator.validateChainId(chainId);
      const chainHealth = await this.healthService.checkChainHealth(chainId);
      return this.createResponse(true, chainHealth);
    } catch (error) {
      if (error instanceof ValidationError) {
        return this.createResponse(false, null, error.message, APP_CONSTANTS.HTTP_STATUS.BAD_REQUEST);
      }
      
      logger.error('Failed to get chain health', { error: error instanceof Error ? error.message : error });
      return this.createResponse(
        false, 
        null, 
        error instanceof Error ? error.message : 'Failed to retrieve chain health',
        APP_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * POST /admin/health/check - Trigger health check
   */
  async triggerHealthCheck(request: Request): Promise<Response> {
    try {
      if (!this.authenticateAdmin(request)) {
        return this.createResponse(false, null, 'Unauthorized', APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED);
      }

      // Run health check and return results
      const results = await this.healthService.checkAllHealth();
      await this.healthService.saveHealthResults(results);
      
      logger.info('Health check triggered successfully');
      return this.createResponse(true, results);
    } catch (error) {
      logger.error('Failed to trigger health check', { error: error instanceof Error ? error.message : error });
      return this.createResponse(
        false, 
        null, 
        error instanceof Error ? error.message : 'Failed to trigger health check',
        APP_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * PUT /admin/chains/:chainId/rpcs/:rpcUrl/status - Update RPC status
   */
  async updateRPCStatus(request: Request, chainId: number | string, rpcUrl: string): Promise<Response> {
    try {
      if (!this.authenticateAdmin(request)) {
        return this.createResponse(false, null, 'Unauthorized', APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED);
      }

      Validator.validateChainId(chainId);
      Validator.validateRPCUrl(rpcUrl);
      
      const requestData = await request.json() as { isActive: boolean };
      await this.configService.updateRPCStatus(chainId, rpcUrl, requestData.isActive);
      
      logger.info('RPC status updated successfully', { chainId, rpcUrl, isActive: requestData.isActive });
      return this.createResponse(true, { message: `RPC status updated successfully` });
    } catch (error) {
      if (error instanceof ValidationError) {
        return this.createResponse(false, null, error.message, APP_CONSTANTS.HTTP_STATUS.BAD_REQUEST);
      }
      
      logger.error('Failed to update RPC status', { error: error instanceof Error ? error.message : error });
      return this.createResponse(
        false, 
        null, 
        error instanceof Error ? error.message : 'Failed to update RPC status',
        APP_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * POST /admin/reset - Reset configuration to default
   */
  async resetConfig(request: Request): Promise<Response> {
    try {
      if (!this.authenticateAdmin(request)) {
        return this.createResponse(false, null, 'Unauthorized', APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED);
      }

      await this.configService.resetToDefault();
      logger.info('Configuration reset to default successfully');
      return this.createResponse(true, { message: 'Configuration reset to default successfully' });
    } catch (error) {
      logger.error('Failed to reset config', { error: error instanceof Error ? error.message : error });
      return this.createResponse(
        false, 
        null, 
        error instanceof Error ? error.message : 'Failed to reset configuration',
        APP_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * GET /admin/stats - Get system statistics
   */
  async getStats(request: Request): Promise<Response> {
    try {
      if (!this.authenticateAdmin(request)) {
        return this.createResponse(false, null, 'Unauthorized', APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED);
      }

      const config = await this.configService.getConfig();
      const healthSummary = await this.healthService.getHealthSummary();
      
      const stats = {
        totalChains: Object.keys(config.chains).length,
        totalRPCs: Object.values(config.chains).reduce((total, chain) => total + chain.rpcs.length, 0),
        activeRPCs: Object.values(config.chains).reduce((total, chain) => 
          total + chain.rpcs.filter(rpc => rpc.isActive).length, 0),
        healthSummary,
        lastUpdated: Date.now()
      };

      return this.createResponse(true, stats);
    } catch (error) {
      logger.error('Failed to get stats', { error: error instanceof Error ? error.message : error });
      return this.createResponse(
        false, 
        null, 
        error instanceof Error ? error.message : 'Failed to retrieve statistics',
        APP_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }
}