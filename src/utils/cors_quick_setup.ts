import { Env, RPCConfig } from '../types';
import { ConfigService } from '../services/config_service';
import { createAllowAllCORSConfig } from './cors';
import { logger } from './logger';

/**
 * Quick setup utility to enable allow-all CORS for the entire system
 */
export class CORSQuickSetup {
  private configService: ConfigService;

  constructor(env: Env) {
    this.configService = new ConfigService(env);
  }

  /**
   * Enable allow-all CORS for the entire system
   * This will update the stored configuration
   */
  async enableAllowAllCORS(): Promise<boolean> {
    try {
      // Get current config
      const currentConfig = await this.configService.getConfig();
      
      // Update CORS configuration to allow all
      const allowAllCorsConfig = createAllowAllCORSConfig();
      
      const updatedConfig: RPCConfig = {
        ...currentConfig,
        cors: allowAllCorsConfig
      };

      // Save updated config
      await this.configService.saveConfig(updatedConfig);
      
      logger.info('Successfully enabled allow-all CORS configuration', {
        corsConfig: allowAllCorsConfig
      });

      return true;
    } catch (error) {
      logger.error('Failed to enable allow-all CORS', {
        error: error instanceof Error ? error.message : error
      });
      return false;
    }
  }

  /**
   * Check if current CORS configuration allows all origins
   */
  async isAllowAllEnabled(): Promise<boolean> {
    try {
      const config = await this.configService.getConfig();
      return config.cors.enabled && 
             config.cors.allowedOrigins.includes('*') &&
             config.cors.allowedHeaders.includes('*');
    } catch (error) {
      logger.error('Failed to check CORS configuration', {
        error: error instanceof Error ? error.message : error
      });
      return false;
    }
  }

  /**
   * Get current CORS status
   */
  async getCORSStatus(): Promise<{
    enabled: boolean;
    allowsAllOrigins: boolean;
    allowsAllHeaders: boolean;
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
  }> {
    try {
      const config = await this.configService.getConfig();
      const cors = config.cors;

      return {
        enabled: cors.enabled,
        allowsAllOrigins: cors.allowedOrigins.includes('*'),
        allowsAllHeaders: cors.allowedHeaders.includes('*'),
        allowedOrigins: cors.allowedOrigins,
        allowedMethods: cors.allowedMethods,
        allowedHeaders: cors.allowedHeaders
      };
    } catch (error) {
      logger.error('Failed to get CORS status', {
        error: error instanceof Error ? error.message : error
      });
      
      return {
        enabled: false,
        allowsAllOrigins: false,
        allowsAllHeaders: false,
        allowedOrigins: [],
        allowedMethods: [],
        allowedHeaders: []
      };
    }
  }

  /**
   * Restore CORS to development configuration
   */
  async restoreDevelopmentCORS(): Promise<boolean> {
    try {
      const currentConfig = await this.configService.getConfig();
      
      // Use the existing development CORS config
      const devCorsConfig = {
        enabled: true,
        allowedOrigins: ['*'],
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
          'Content-Type',
          'Authorization',
          'X-Requested-With',
          'Accept',
          'Origin',
          'Access-Control-Request-Method',
          'Access-Control-Request-Headers'
        ],
        exposedHeaders: [
          'Content-Length',
          'Content-Type',
          'X-Request-ID'
        ],
        maxAge: 86400,
        credentials: false
      };

      const updatedConfig: RPCConfig = {
        ...currentConfig,
        cors: devCorsConfig
      };

      await this.configService.saveConfig(updatedConfig);
      
      logger.info('Successfully restored development CORS configuration');
      return true;
    } catch (error) {
      logger.error('Failed to restore development CORS', {
        error: error instanceof Error ? error.message : error
      });
      return false;
    }
  }
}

/**
 * Quick utility functions for immediate use
 */

/**
 * Enable allow-all CORS with a single function call
 */
export async function quickEnableAllowAllCORS(env: Env): Promise<boolean> {
  const setup = new CORSQuickSetup(env);
  return setup.enableAllowAllCORS();
}

/**
 * Check if allow-all CORS is currently enabled
 */
export async function isAllowAllCORSEnabled(env: Env): Promise<boolean> {
  const setup = new CORSQuickSetup(env);
  return setup.isAllowAllEnabled();
}

/**
 * Get detailed CORS status
 */
export async function getCORSStatus(env: Env) {
  const setup = new CORSQuickSetup(env);
  return setup.getCORSStatus();
}

/**
 * Create a management endpoint handler for CORS quick setup
 */
export function createCORSQuickSetupHandler(env: Env) {
  const setup = new CORSQuickSetup(env);

  return {
    /**
     * POST /admin/cors/enable-all - Enable allow-all CORS
     */
    async enableAll(request: Request): Promise<Response> {
      try {
        const success = await setup.enableAllowAllCORS();
        
        if (success) {
          return new Response(JSON.stringify({
            success: true,
            message: 'Allow-all CORS enabled successfully',
            timestamp: Date.now()
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } else {
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to enable allow-all CORS',
            timestamp: Date.now()
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now()
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    },

    /**
     * GET /admin/cors/status - Get CORS status
     */
    async getStatus(request: Request): Promise<Response> {
      try {
        const status = await setup.getCORSStatus();
        
        return new Response(JSON.stringify({
          success: true,
          data: status,
          timestamp: Date.now()
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now()
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    },

    /**
     * POST /admin/cors/restore-dev - Restore development CORS
     */
    async restoreDev(request: Request): Promise<Response> {
      try {
        const success = await setup.restoreDevelopmentCORS();
        
        if (success) {
          return new Response(JSON.stringify({
            success: true,
            message: 'Development CORS configuration restored',
            timestamp: Date.now()
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } else {
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to restore development CORS',
            timestamp: Date.now()
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now()
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  };
}