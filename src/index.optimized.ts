import { Env } from './types';
import { ManagementRoutes } from './routes/management';
import { handleMetricsRequest } from './routes/metrics';
import { ProxyService } from './services/proxy_service';
import { HealthService } from './services/health_service';
import { logger } from './utils/logger';
import { AdminUIComponents } from './ui/admin_components';
import { AdminClientService } from './services/admin_client';
import { errorHandler, SystemError } from './utils/error_handler';
import { Router } from './utils/router';

/**
 * Service instances cache (singleton pattern)
 * Reuse service instances across requests to reduce initialization overhead
 */
let managementRoutesInstance: ManagementRoutes | null = null;
let proxyServiceInstance: ProxyService | null = null;
let routerInstance: Router | null = null;

/**
 * Initialize router with all routes
 * Pre-compiled patterns for faster matching
 */
function initializeRouter(env: Env): Router {
	if (routerInstance) {
		return routerInstance;
	}

	const router = new Router();
	const managementRoutes = getManagementRoutes(env);

	// Static routes (fastest)
	router.get('/admin', () => getAdminInterface());
	router.get('/docs', () => getAPIDocumentation());
	router.get('/health', (req) => managementRoutes.getHealthStatus(req));

	// CORS routes
	router.options('*', (req) => managementRoutes.handleOptions());
	router.get('/admin/cors', (req) => managementRoutes.getCORSConfig(req));
	router.put('/admin/cors', (req) => managementRoutes.updateCORSConfig(req));
	router.get('/admin/cors/status', (req) => managementRoutes.getCORSStatus(req));
	router.post('/admin/cors/enable-all', (req) => managementRoutes.enableAllowAllCORS(req));
	router.post('/admin/cors/disable-all', (req) => managementRoutes.disableAllowAllCORS(req));

	// Config routes
	router.get('/admin/config', (req) => managementRoutes.getConfig(req));
	router.put('/admin/config', (req) => managementRoutes.updateConfig(req));
	router.delete('/admin/config', (req) => managementRoutes.resetConfig(req));
	router.get('/config', (req) => managementRoutes.getConfig(req));
	router.put('/config', (req) => managementRoutes.updateConfig(req));
	router.delete('/config', (req) => managementRoutes.resetConfig(req));

	// Chain routes
	router.get('/admin/chains', (req) => managementRoutes.getChains(req));
	router.get('/chains', (req) => managementRoutes.getChains(req));
	router.get('/chains/:chainId', (req, params) => {
		const parsed = parseInt(params.chainId, 10);
		const chainId = isNaN(parsed) ? params.chainId : parsed;
		return managementRoutes.getChainConfig(req, chainId);
	});
	router.put('/chains/:chainId', (req, params) => {
		const parsed = parseInt(params.chainId, 10);
		const chainId = isNaN(parsed) ? params.chainId : parsed;
		return managementRoutes.updateChainConfig(req, chainId);
	});
	router.delete('/chains/:chainId', (req, params) => {
		const parsed = parseInt(params.chainId, 10);
		const chainId = isNaN(parsed) ? params.chainId : parsed;
		return managementRoutes.removeChainConfig(req, chainId);
	});

	// RPC routes
	router.post('/chains/:chainId/rpcs', (req, params) => {
		const parsed = parseInt(params.chainId, 10);
		const chainId = isNaN(parsed) ? params.chainId : parsed;
		return managementRoutes.addRPCEndpoint(req, chainId);
	});
	router.post('/admin/chains/:chainId/rpcs', (req, params) => {
		const chainId = parseInt(params.chainId);
		return managementRoutes.addRPCEndpoint(req, chainId);
	});
	router.post('/chains/:chainId/rpcs/remove', (req, params) => {
		const parsed = parseInt(params.chainId, 10);
		const chainId = isNaN(parsed) ? params.chainId : parsed;
		return managementRoutes.removeRPCEndpoint(req, chainId);
	});
	router.put('/chains/:chainId/rpcs/status', (req, params) => {
		const parsed = parseInt(params.chainId, 10);
		const chainId = isNaN(parsed) ? params.chainId : parsed;
		const url = new URL(req.url);
		const rpcUrl = url.searchParams.get('url');
		if (rpcUrl) {
			return managementRoutes.updateRPCStatus(req, chainId, rpcUrl);
		}
		return new Response('Missing url parameter', { status: 400 });
	});

	// Health routes
	router.get('/admin/health', (req) => managementRoutes.getHealthStatus(req));
	router.post('/admin/health', (req) => managementRoutes.triggerHealthCheck(req));
	router.post('/health', (req) => managementRoutes.triggerHealthCheck(req));
	router.get('/health/:chainId', (req, params) => {
		const parsed = parseInt(params.chainId, 10);
		const chainId = isNaN(parsed) ? params.chainId : parsed;
		return managementRoutes.getChainHealth(req, chainId);
	});

	// Stats routes
	router.get('/stats', (req) => managementRoutes.getStats(req));

	routerInstance = router;
	return router;
}

/**
 * Get or create ManagementRoutes instance
 */
function getManagementRoutes(env: Env): ManagementRoutes {
	if (!managementRoutesInstance) {
		managementRoutesInstance = new ManagementRoutes(env);
	}
	return managementRoutesInstance;
}

/**
 * Get or create ProxyService instance
 */
function getProxyService(env: Env): ProxyService {
	if (!proxyServiceInstance) {
		proxyServiceInstance = new ProxyService(env, env.RPC_CACHE as any);
	}
	return proxyServiceInstance;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		try {
			// Fast path for metrics (before router)
			if (path.startsWith('/metrics')) {
				return await handleMetricsRequest(request, env);
			}

			// Initialize router
			const router = initializeRouter(env);

			// Try to match route
			const match = router.match(request);
			if (match) {
				return await match.handler(request, match.params);
			}

			// No match - proxy the request
			const proxyService = getProxyService(env);
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
