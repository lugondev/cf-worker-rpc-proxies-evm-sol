import { Logger } from '../utils/logger';

export interface MetricData {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
  unit?: string;
}

export interface PerformanceMetric {
  operation: string;
  duration: number;
  success: boolean;
  component: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface ErrorMetric {
  errorType: string;
  errorCode?: string;
  component: string;
  timestamp: number;
  message?: string;
  metadata?: Record<string, any>;
}

export interface UsageMetric {
  endpoint: string;
  method: string;
  chainId: number;
  timestamp: number;
  responseTime: number;
  statusCode: number;
  userAgent?: string;
  ip?: string;
}

export class MetricsService {
  private logger: Logger;
  private metrics: MetricData[] = [];
  private performanceMetrics: PerformanceMetric[] = [];
  private errorMetrics: ErrorMetric[] = [];
  private usageMetrics: UsageMetric[] = [];
  private maxMetricsBuffer = 1000;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Record a custom metric
   */
  recordMetric(name: string, value: number, tags?: Record<string, string>, unit?: string): void {
    const metric: MetricData = {
      name,
      value,
      timestamp: Date.now(),
      tags,
      unit
    };

    this.metrics.push(metric);
    this.trimBuffer(this.metrics, this.maxMetricsBuffer);

    this.logger.logAnalytics('metric_recorded', {
      metric_name: name,
      metric_value: value,
      metric_unit: unit,
      metric_tags: tags
    });
  }

  /**
   * Record performance metric
   */
  recordPerformance(
    operation: string,
    duration: number,
    success: boolean,
    component: string,
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      operation,
      duration,
      success,
      component,
      timestamp: Date.now(),
      metadata
    };

    this.performanceMetrics.push(metric);
    this.trimBuffer(this.performanceMetrics, this.maxMetricsBuffer);

    this.logger.logPerformance(operation, duration, component, undefined, {
      success,
      ...metadata
    });
  }

  /**
   * Record error metric
   */
  recordError(
    errorType: string,
    component: string,
    errorCode?: string,
    message?: string,
    metadata?: Record<string, any>
  ): void {
    const metric: ErrorMetric = {
      errorType,
      errorCode,
      component,
      timestamp: Date.now(),
      message,
      metadata
    };

    this.errorMetrics.push(metric);
    this.trimBuffer(this.errorMetrics, this.maxMetricsBuffer);

    this.logger.logAnalytics('error_recorded', {
      error_type: errorType,
      error_code: errorCode,
      component,
      message,
      ...metadata
    });
  }

  /**
   * Record API usage metric
   */
  recordUsage(
    endpoint: string,
    method: string,
    chainId: number,
    responseTime: number,
    statusCode: number,
    userAgent?: string,
    ip?: string
  ): void {
    const metric: UsageMetric = {
      endpoint,
      method,
      chainId,
      timestamp: Date.now(),
      responseTime,
      statusCode,
      userAgent,
      ip
    };

    this.usageMetrics.push(metric);
    this.trimBuffer(this.usageMetrics, this.maxMetricsBuffer);

    this.logger.logAnalytics('api_usage', {
      endpoint,
      method,
      chain_id: chainId,
      response_time: responseTime,
      status_code: statusCode,
      user_agent: userAgent,
      ip
    });
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(component?: string, operation?: string): {
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    successRate: number;
    totalRequests: number;
  } {
    let filteredMetrics = this.performanceMetrics;

    if (component) {
      filteredMetrics = filteredMetrics.filter(m => m.component === component);
    }

    if (operation) {
      filteredMetrics = filteredMetrics.filter(m => m.operation === operation);
    }

    if (filteredMetrics.length === 0) {
      return {
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        successRate: 0,
        totalRequests: 0
      };
    }

    const durations = filteredMetrics.map(m => m.duration);
    const successCount = filteredMetrics.filter(m => m.success).length;

    return {
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      successRate: (successCount / filteredMetrics.length) * 100,
      totalRequests: filteredMetrics.length
    };
  }

  /**
   * Get error statistics
   */
  getErrorStats(component?: string): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsByComponent: Record<string, number>;
  } {
    let filteredMetrics = this.errorMetrics;

    if (component) {
      filteredMetrics = filteredMetrics.filter(m => m.component === component);
    }

    const errorsByType: Record<string, number> = {};
    const errorsByComponent: Record<string, number> = {};

    filteredMetrics.forEach(metric => {
      errorsByType[metric.errorType] = (errorsByType[metric.errorType] || 0) + 1;
      errorsByComponent[metric.component] = (errorsByComponent[metric.component] || 0) + 1;
    });

    return {
      totalErrors: filteredMetrics.length,
      errorsByType,
      errorsByComponent
    };
  }

  /**
   * Get usage statistics
   */
  getUsageStats(timeWindow?: number): {
    totalRequests: number;
    avgResponseTime: number;
    requestsByChain: Record<number, number>;
    requestsByEndpoint: Record<string, number>;
    statusCodeDistribution: Record<number, number>;
  } {
    let filteredMetrics = this.usageMetrics;

    if (timeWindow) {
      const cutoff = Date.now() - timeWindow;
      filteredMetrics = filteredMetrics.filter(m => m.timestamp > cutoff);
    }

    const requestsByChain: Record<number, number> = {};
    const requestsByEndpoint: Record<string, number> = {};
    const statusCodeDistribution: Record<number, number> = {};

    let totalResponseTime = 0;

    filteredMetrics.forEach(metric => {
      requestsByChain[metric.chainId] = (requestsByChain[metric.chainId] || 0) + 1;
      requestsByEndpoint[metric.endpoint] = (requestsByEndpoint[metric.endpoint] || 0) + 1;
      statusCodeDistribution[metric.statusCode] = (statusCodeDistribution[metric.statusCode] || 0) + 1;
      totalResponseTime += metric.responseTime;
    });

    return {
      totalRequests: filteredMetrics.length,
      avgResponseTime: filteredMetrics.length > 0 ? totalResponseTime / filteredMetrics.length : 0,
      requestsByChain,
      requestsByEndpoint,
      statusCodeDistribution
    };
  }

  /**
   * Export all metrics for external monitoring systems
   */
  exportMetrics(): {
    metrics: MetricData[];
    performance: PerformanceMetric[];
    errors: ErrorMetric[];
    usage: UsageMetric[];
    timestamp: number;
  } {
    return {
      metrics: [...this.metrics],
      performance: [...this.performanceMetrics],
      errors: [...this.errorMetrics],
      usage: [...this.usageMetrics],
      timestamp: Date.now()
    };
  }

  /**
   * Clear all metrics (useful for testing or periodic cleanup)
   */
  clearMetrics(): void {
    this.metrics = [];
    this.performanceMetrics = [];
    this.errorMetrics = [];
    this.usageMetrics = [];

    this.logger.info('All metrics cleared');
  }

  /**
   * Trim buffer to prevent memory issues
   */
  private trimBuffer<T>(buffer: T[], maxSize: number): void {
    if (buffer.length > maxSize) {
      buffer.splice(0, buffer.length - maxSize);
    }
  }
}

// Singleton instance
let metricsServiceInstance: MetricsService | null = null;

export function getMetricsService(logger: Logger): MetricsService {
  if (!metricsServiceInstance) {
    metricsServiceInstance = new MetricsService(logger);
  }
  return metricsServiceInstance;
}