import { Env } from '../types';
import { getMetricsService } from '../services/metrics_service';
import { Logger, LogLevel } from '../utils/logger';
import { ResponseBuilder } from '../utils/response';

/**
 * Handle metrics endpoint requests
 */
export async function handleMetricsRequest(request: Request, env: Env): Promise<Response> {
  const logger = Logger.getInstance(LogLevel.INFO, { service: 'metrics-endpoint' });
  const metricsService = getMetricsService(logger);
  
  const url = new URL(request.url);
  const path = url.pathname;
  
  try {
    switch (path) {
      case '/metrics':
        return handleMetricsExport(metricsService);
      
      case '/metrics/performance':
        return handlePerformanceStats(request, metricsService);
      
      case '/metrics/errors':
        return handleErrorStats(request, metricsService);
      
      case '/metrics/usage':
        return handleUsageStats(request, metricsService);
      
      case '/metrics/clear':
        if (request.method !== 'POST') {
          return ResponseBuilder.error('METHOD_NOT_ALLOWED', 'Method not allowed', 405);
        }
        return handleClearMetrics(metricsService);
      
      default:
        return ResponseBuilder.error('NOT_FOUND', 'Metrics endpoint not found', 404);
    }
  } catch (error) {
    logger.error('Error handling metrics request', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      path 
    });
    return ResponseBuilder.error('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/**
 * Export all metrics data
 */
function handleMetricsExport(metricsService: any): Response {
  const metrics = metricsService.exportMetrics();
  return ResponseBuilder.success(metrics);
}

/**
 * Get performance statistics
 */
function handlePerformanceStats(request: Request, metricsService: any): Response {
  const url = new URL(request.url);
  const component = url.searchParams.get('component') || undefined;
  const operation = url.searchParams.get('operation') || undefined;
  
  const stats = metricsService.getPerformanceStats(component, operation);
  return ResponseBuilder.success({
    component,
    operation,
    stats
  });
}

/**
 * Get error statistics
 */
function handleErrorStats(request: Request, metricsService: any): Response {
  const url = new URL(request.url);
  const component = url.searchParams.get('component') || undefined;
  
  const stats = metricsService.getErrorStats(component);
  return ResponseBuilder.success({
    component,
    stats
  });
}

/**
 * Get usage statistics
 */
function handleUsageStats(request: Request, metricsService: any): Response {
  const url = new URL(request.url);
  const timeWindow = url.searchParams.get('timeWindow');
  const timeWindowMs = timeWindow ? parseInt(timeWindow) : undefined;
  
  const stats = metricsService.getUsageStats(timeWindowMs);
  return ResponseBuilder.success({
    timeWindow: timeWindowMs,
    stats
  });
}

/**
 * Clear all metrics
 */
function handleClearMetrics(metricsService: any): Response {
  metricsService.clearMetrics();
  return ResponseBuilder.success({ message: 'Metrics cleared successfully' });
}