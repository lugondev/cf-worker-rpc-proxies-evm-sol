import { Env } from './types';
import { ManagementRoutes } from './routes/management';
import { handleMetricsRequest } from './routes/metrics';
import { ProxyService } from './services/proxy_service';
import { HealthService } from './services/health_service';
import { logger } from './utils/logger';
import { AdminUIComponents } from './ui/admin_components';
import { AdminClientService } from './services/admin_client';
import { errorHandler, SystemError } from './utils/error_handler';

/**
 * Handle management routes
 */
async function handleManagementRoutes(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  const managementRoutes = new ManagementRoutes(env);

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return managementRoutes.handleOptions();
  }

  // Admin API routes
  if (path === '/admin/config') {
    switch (method) {
      case 'GET':
        return managementRoutes.getConfig(request);
      case 'PUT':
        return managementRoutes.updateConfig(request);
      case 'DELETE':
        return managementRoutes.resetConfig(request);
    }
  }

  if (path === '/admin/chains') {
    if (method === 'GET') {
      return managementRoutes.getChains(request);
    }
  }

  if (path === '/admin/health') {
    switch (method) {
      case 'GET':
        return managementRoutes.getHealthStatus(request);
      case 'POST':
        return managementRoutes.triggerHealthCheck(request);
    }
  }

  // Admin RPC endpoint management
  const adminRpcMatch = path.match(/^\/admin\/chains\/(\d+)\/rpcs$/);
  if (adminRpcMatch) {
    const chainId = parseInt(adminRpcMatch[1]);
    switch (method) {
      case 'POST':
        return managementRoutes.addRPCEndpoint(request, chainId);
    }
  }

  // Config management (legacy routes)
  if (path === '/config') {
    switch (method) {
      case 'GET':
        return managementRoutes.getConfig(request);
      case 'PUT':
        return managementRoutes.updateConfig(request);
      case 'DELETE':
        return managementRoutes.resetConfig(request);
    }
  }

  // Chain management
  if (path === '/chains') {
    if (method === 'GET') {
      return managementRoutes.getChains(request);
    }
  }

  // Individual chain management
  const chainMatch = path.match(/^\/chains\/(\d+)$/);
  if (chainMatch) {
    const chainId = parseInt(chainMatch[1]);
    switch (method) {
      case 'GET':
        return managementRoutes.getChainConfig(request, chainId);
      case 'PUT':
        return managementRoutes.updateChainConfig(request, chainId);
      case 'DELETE':
        return managementRoutes.removeChainConfig(request, chainId);
    }
  }

  // RPC endpoint management
  const rpcMatch = path.match(/^\/chains\/(\d+)\/rpcs$/);
  if (rpcMatch) {
    const chainId = parseInt(rpcMatch[1]);
    switch (method) {
      case 'POST':
        return managementRoutes.addRPCEndpoint(request, chainId);
    }
  }

  // Remove RPC endpoint
  const removeRpcMatch = path.match(/^\/chains\/(\d+)\/rpcs\/remove$/);
  if (removeRpcMatch) {
    const chainId = parseInt(removeRpcMatch[1]);
    if (method === 'POST') {
      return managementRoutes.removeRPCEndpoint(request, chainId);
    }
  }

  // Health endpoints
  if (path === '/health') {
    switch (method) {
      case 'GET':
        return managementRoutes.getHealthStatus(request);
      case 'POST':
        return managementRoutes.triggerHealthCheck(request);
    }
  }

  // Chain health
  const healthMatch = path.match(/^\/health\/(\d+)$/);
  if (healthMatch) {
    const chainId = parseInt(healthMatch[1]);
    if (method === 'GET') {
      return managementRoutes.getChainHealth(request, chainId);
    }
  }

  // RPC status update
  const statusMatch = path.match(/^\/chains\/(\d+)\/rpcs\/status$/);
  if (statusMatch) {
    const chainId = parseInt(statusMatch[1]);
    if (method === 'PUT') {
      const url = new URL(request.url);
      const rpcUrl = url.searchParams.get('url');
      if (rpcUrl) {
        return managementRoutes.updateRPCStatus(request, chainId, rpcUrl);
      }
    }
  }

  // Stats endpoint
  if (path === '/stats' && method === 'GET') {
    return managementRoutes.getStats(request);
  }

  return new Response('Not Found', { status: 404 });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Admin interface (handle before management routes)
      if (path === '/admin') {
        return getAdminInterface();
      }

      // Metrics routes
      if (path.startsWith('/metrics')) {
        return await handleMetricsRequest(request, env);
      }

      // Management routes (excluding /admin)
      if (path.startsWith('/admin/') || path.startsWith('/config') || 
          path.startsWith('/chains') || path.startsWith('/health') || 
          path.startsWith('/stats')) {
        return await handleManagementRoutes(request, env);
      }

      // API documentation
      if (path === '/docs') {
        return getAPIDocumentation();
      }

      // Proxy all other requests
      const proxyService = new ProxyService(env, env.RPC_CACHE as any);
      return await proxyService.handleRequest(request, env);

    } catch (error) {
      const systemError = new SystemError('Request handling failed', 'main-worker');
      const handledError = errorHandler.handleError(error as Error);
      return errorHandler.createErrorResponse(handledError);
    }
  },

  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    try {
      const healthService = new HealthService(env);
      await healthService.runPeriodicHealthCheck();
      logger.info('Scheduled health check completed');
    } catch (error) {
      const systemError = new SystemError('Scheduled health check failed', 'health-service');
      errorHandler.handleError(error as Error);
    }
  }
};

/**
 * Get API documentation
 */
function getAPIDocumentation(): Response {
  const docs = `
# RPC EVM Proxy API Documentation

## Management Endpoints

### Configuration
- GET /config - Get current configuration
- PUT /config - Update configuration
- DELETE /config - Reset configuration

### Chain Management
- GET /chains - List all chains
- GET /chains/{id} - Get specific chain config
- PUT /chains/{id} - Update chain config
- DELETE /chains/{id} - Remove chain

### RPC Management
- POST /chains/{id}/rpcs - Add RPC endpoint
- POST /chains/{id}/rpcs/remove - Remove RPC endpoint
- PUT /chains/{id}/rpcs/status - Update RPC status

### Health Monitoring
- GET /health - Get overall health status
- POST /health - Trigger health check
- GET /health/{id} - Get chain-specific health

### Statistics
- GET /stats - Get proxy statistics

## Authentication
All management endpoints require Bearer token authentication:
\`Authorization: Bearer YOUR_ADMIN_API_KEY\`
  `;

  return new Response(docs, {
    headers: { 'Content-Type': 'text/plain' }
  });
}

/**
 * Get admin interface
 */
function getAdminInterface(): Response {
  const adminPage = AdminUIComponents.generateAdminPage('RPC EVM Proxy - Admin Interface');
  const clientScript = AdminClientService.generateClientScript();
  
  // Insert the client script before closing body tag
  const pageWithScript = adminPage.replace('</body>', `${clientScript}</body>`);
  
  return new Response(pageWithScript, {
    headers: { 'Content-Type': 'text/html' }
  });
}