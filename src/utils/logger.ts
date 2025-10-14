/**
 * Logging utility for Cloudflare Workers
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  data?: any;
  requestId?: string;
  chainId?: number | string;
  rpcUrl?: string;
  component?: string;
  operation?: string;
  duration?: number;
  errorCode?: string;
  statusCode?: number;
  userAgent?: string;
  ip?: string;
  method?: string;
  url?: string;
  correlationId?: string;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private context: Record<string, any>;

  constructor(level: LogLevel = LogLevel.INFO, context: Record<string, any> = {}) {
    this.logLevel = level;
    this.context = context;
  }

  // Static method to get singleton instance
  static getInstance(level: LogLevel = LogLevel.INFO, context: Record<string, any> = {}): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(level, context);
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private log(level: LogLevel, message: string, data?: any, context?: Partial<LogEntry>): void {
    if (level < this.logLevel) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      data,
      ...context
    };

    const levelName = LogLevel[level];
    const timestamp = new Date(entry.timestamp).toISOString();
    
    let logMessage = `[${timestamp}] ${levelName}: ${message}`;
    
    if (entry.requestId) {
      logMessage += ` [RequestID: ${entry.requestId}]`;
    }
    
    if (entry.chainId) {
      logMessage += ` [ChainID: ${entry.chainId}]`;
    }
    
    if (entry.rpcUrl) {
      logMessage += ` [RPC: ${entry.rpcUrl}]`;
    }

    if (data) {
      logMessage += ` Data: ${JSON.stringify(data)}`;
    }

    // Use appropriate console method based on log level
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logMessage);
        break;
      case LogLevel.INFO:
        console.info(logMessage);
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        break;
      case LogLevel.ERROR:
        console.error(logMessage);
        break;
    }
  }

  debug(message: string, data?: any, context?: Partial<LogEntry>): void {
    this.log(LogLevel.DEBUG, message, data, context);
  }

  info(message: string, data?: any, context?: Partial<LogEntry>): void {
    this.log(LogLevel.INFO, message, data, context);
  }

  warn(message: string, data?: any, context?: Partial<LogEntry>): void {
    this.log(LogLevel.WARN, message, data, context);
  }

  error(message: string, data?: any, context?: Partial<LogEntry>): void {
    this.log(LogLevel.ERROR, message, data, context);
  }

  /**
   * Log RPC request details
   */
  logRPCRequest(
    requestId: string,
    chainId: number | string,
    method: string,
    rpcUrl: string,
    duration?: number,
    success?: boolean
  ): void {
    const message = success !== undefined 
      ? `RPC ${success ? 'SUCCESS' : 'FAILED'}: ${method} (${duration}ms)`
      : `RPC REQUEST: ${method}`;

    this.info(message, { method, duration, success }, {
      requestId,
      chainId,
      rpcUrl
    });
  }

  /**
   * Log health check results
   */
  logHealthCheck(
    chainId: number | string,
    rpcUrl: string,
    success: boolean,
    responseTime?: number,
    error?: string
  ): void {
    const message = `Health check ${success ? 'PASSED' : 'FAILED'}: Chain ${chainId}`;
    
    this.info(message, { responseTime, error }, {
      chainId,
      rpcUrl
    });
  }

  /**
   * Log configuration changes
   */
  logConfigChange(action: string, details: any, requestId?: string): void {
    this.info(`Config ${action}`, details, { requestId });
  }

  /**
   * Generate a unique request ID
   */
  static generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  // Performance tracking methods
  logPerformance(
    operation: string,
    duration: number,
    component: string,
    requestId?: string,
    additionalData?: any
  ): void {
    this.info(`Performance: ${operation} completed`, additionalData, {
      operation,
      duration,
      component,
      requestId
    });
  }

  // Error correlation and tracking
  logError(
    error: Error,
    component: string,
    operation?: string,
    requestId?: string,
    correlationId?: string,
    additionalContext?: any
  ): void {
    this.error(`Error in ${component}${operation ? ` during ${operation}` : ''}: ${error.message}`, {
      errorName: error.name,
      errorStack: error.stack,
      ...additionalContext
    }, {
      component,
      operation,
      requestId,
      correlationId,
      errorCode: (error as any).code
    });
  }

  // Request/Response logging
  logRequest(
    method: string,
    url: string,
    requestId: string,
    userAgent?: string,
    ip?: string,
    additionalData?: any
  ): void {
    this.info(`Incoming request: ${method} ${url}`, additionalData, {
      method,
      url,
      requestId,
      userAgent,
      ip,
      component: 'http-handler'
    });
  }

  logResponse(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    requestId: string,
    additionalData?: any
  ): void {
    const level = statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    this.log(level, `Response: ${method} ${url} - ${statusCode}`, additionalData, {
      method,
      url,
      statusCode,
      duration,
      requestId,
      component: 'http-handler'
    });
  }

  // Business logic logging
  logBusinessEvent(
    event: string,
    component: string,
    data?: any,
    requestId?: string,
    correlationId?: string
  ): void {
    this.info(`Business Event: ${event}`, data, {
      component,
      operation: event,
      requestId,
      correlationId
    });
  }

  // Security logging
  logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details?: any,
    requestId?: string,
    ip?: string
  ): void {
    const level = severity === 'critical' || severity === 'high' ? LogLevel.ERROR : LogLevel.WARN;
    this.log(level, `Security Event [${severity.toUpperCase()}]: ${event}`, details, {
      component: 'security',
      operation: event,
      requestId,
      ip
    });
  }

  // Cache operations logging
  logCacheOperation(
    operation: 'hit' | 'miss' | 'set' | 'delete' | 'clear',
    key: string,
    component: string,
    duration?: number,
    requestId?: string
  ): void {
    this.debug(`Cache ${operation}: ${key}`, { key }, {
      component,
      operation: `cache-${operation}`,
      duration,
      requestId
    });
  }

  // External service calls logging
  logExternalCall(
    service: string,
    operation: string,
    url: string,
    method: string,
    statusCode?: number,
    duration?: number,
    requestId?: string,
    success?: boolean
  ): void {
    const level = success === false || (statusCode && statusCode >= 400) ? LogLevel.WARN : LogLevel.INFO;
    this.log(level, `External call to ${service}: ${operation}`, {
      service,
      url,
      method,
      statusCode,
      success
    }, {
      component: 'external-service',
      operation,
      duration,
      requestId,
      statusCode
    });
  }

  // Structured logging for analytics
  logAnalytics(
    event: string,
    properties: Record<string, any>,
    requestId?: string
  ): void {
    this.info(`Analytics: ${event}`, properties, {
      component: 'analytics',
      operation: event,
      requestId
    });
  }
}

// Export singleton instance
export const logger = Logger.getInstance();