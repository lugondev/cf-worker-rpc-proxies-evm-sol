/**
 * Comprehensive Error Handling System
 * Provides centralized error management, custom error classes, and logging
 */

import { Logger, LogLevel } from './logger';
import { ErrorCode, HttpStatusCode, ValidationError as TypeValidationError } from '../types';

// Base custom error class
export abstract class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: number;
  public readonly requestId?: string;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    requestId?: string,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = Date.now();
    this.requestId = requestId;
    this.context = context;

    // Maintains proper stack trace for where our error was thrown (if available)
    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      requestId: this.requestId,
      context: this.context,
      stack: this.stack
    };
  }
}

// Validation Error
export class ValidationError extends AppError {
  constructor(
    message: string = 'Validation failed',
    field?: string,
    value?: any,
    requestId?: string
  ) {
    super(
      message,
      ErrorCode.INVALID_PARAMS.toString(),
      HttpStatusCode.BAD_REQUEST,
      true,
      requestId,
      { field, value }
    );
  }
}

// Authentication Error
export class AuthenticationError extends AppError {
  constructor(
    message: string = 'Authentication failed',
    requestId?: string
  ) {
    super(
      message,
      ErrorCode.UNAUTHORIZED_ACCESS,
      HttpStatusCode.UNAUTHORIZED,
      true,
      requestId
    );
  }
}

// Authorization Error
export class AuthorizationError extends AppError {
  constructor(
    message: string = 'Access denied',
    resource?: string,
    requestId?: string
  ) {
    super(
      message,
      ErrorCode.UNAUTHORIZED_ACCESS,
      HttpStatusCode.FORBIDDEN,
      true,
      requestId,
      { resource }
    );
  }
}

// Network Error
export class NetworkError extends AppError {
  constructor(
    message: string = 'Network error occurred',
    url?: string,
    method?: string,
    requestId?: string
  ) {
    super(
      message,
      ErrorCode.NETWORK_ERROR,
      HttpStatusCode.SERVICE_UNAVAILABLE,
      true,
      requestId,
      { url, method }
    );
  }
}

// System Error
export class SystemError extends AppError {
  constructor(
    message: string = 'Internal system error',
    component?: string,
    requestId?: string
  ) {
    super(
      message,
      ErrorCode.INTERNAL_ERROR.toString(),
      HttpStatusCode.INTERNAL_SERVER_ERROR,
      false,
      requestId,
      { component }
    );
  }
}

// Configuration Error
export class ConfigurationError extends AppError {
  constructor(
    message: string = 'Configuration error',
    configKey?: string,
    requestId?: string
  ) {
    super(
      message,
      ErrorCode.INVALID_PARAMS.toString(),
      HttpStatusCode.BAD_REQUEST,
      true,
      requestId,
      { configKey }
    );
  }
}

// Chain Not Supported Error
export class ChainNotSupportedError extends AppError {
  constructor(
    chainId: string,
    requestId?: string
  ) {
    super(
      `Chain ${chainId} is not supported`,
      ErrorCode.CHAIN_NOT_SUPPORTED.toString(),
      HttpStatusCode.BAD_REQUEST,
      true,
      requestId,
      { chainId }
    );
  }
}

// Rate Limit Error
export class RateLimitError extends AppError {
  constructor(
    message: string = 'Rate limit exceeded',
    limit?: number,
    resetTime?: number,
    requestId?: string
  ) {
    super(
      message,
      ErrorCode.RATE_LIMIT_EXCEEDED,
      HttpStatusCode.SERVICE_UNAVAILABLE, // Using available status code
      true,
      requestId,
      { limit, resetTime }
    );
  }
}

// Not Found Error
export class NotFoundError extends AppError {
  constructor(
    resource: string = 'Resource',
    id?: string,
    requestId?: string
  ) {
    super(
      `${resource} not found${id ? `: ${id}` : ''}`,
      ErrorCode.CHAIN_NOT_FOUND, // Using available error code
      HttpStatusCode.NOT_FOUND,
      true,
      requestId,
      { resource, id }
    );
  }
}

// Timeout Error
export class TimeoutError extends AppError {
  constructor(
    operation: string = 'Operation',
    timeout?: number,
    requestId?: string
  ) {
    super(
      `${operation} timed out${timeout ? ` after ${timeout}ms` : ''}`,
      ErrorCode.TIMEOUT,
      HttpStatusCode.GATEWAY_TIMEOUT, // Using available status code
      true,
      requestId,
      { operation, timeout }
    );
  }
}

// Centralized Error Handler
export class ErrorHandler {
  private static instance: ErrorHandler;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Handle and log errors
  handleError(error: Error | AppError, requestId?: string): AppError {
    let handledError: AppError;

    if (error instanceof AppError) {
      handledError = error;
    } else {
      // Convert unknown errors to SystemError
      handledError = new SystemError(
        error.message || 'Unknown error occurred',
        'unknown',
        requestId
      );
    }

    // Log the error
    this.logError(handledError);

    return handledError;
  }

  // Log error with appropriate level
  private logError(error: AppError): void {
    const logData = {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      requestId: error.requestId,
      context: error.context,
      stack: error.stack,
      timestamp: error.timestamp
    };

    if (error.statusCode >= 500) {
      this.logger.error('System Error', logData);
    } else if (error.statusCode >= 400) {
      this.logger.warn('Client Error', logData);
    } else {
      this.logger.info('Error Handled', logData);
    }
  }

  // Check if error is operational (expected) or programming error
  isOperationalError(error: Error): boolean {
    if (error instanceof AppError) {
      return error.isOperational;
    }
    return false;
  }

  // Create standardized error response
  createErrorResponse(error: AppError): Response {
    const errorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        timestamp: error.timestamp,
        requestId: error.requestId
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: error.statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': error.requestId || 'unknown'
      }
    });
  }

  // Handle uncaught exceptions (for Worker environment)
  handleUncaughtError(error: Error, requestId?: string): void {
    const handledError = this.handleError(error, requestId);
    
    // In production, you might want to send this to an external monitoring service
    this.logger.error('Uncaught Error', {
      error: handledError.toJSON(),
      environment: 'cloudflare-worker'
    });
  }
}

// Utility functions for common error scenarios
export const ErrorUtils = {
  // Wrap async functions with error handling
  wrapAsync: <T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    errorHandler?: (error: Error) => AppError
  ) => {
    return async (...args: T): Promise<R> => {
      try {
        return await fn(...args);
      } catch (error) {
        const handler = ErrorHandler.getInstance();
        const handledError = errorHandler 
          ? errorHandler(error as Error)
          : handler.handleError(error as Error);
        throw handledError;
      }
    };
  },

  // Validate required fields
  validateRequired: (
    data: Record<string, any>,
    requiredFields: string[],
    requestId?: string
  ): void => {
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        throw new ValidationError(
          `Field '${field}' is required`,
          field,
          data[field],
          requestId
        );
      }
    }
  },

  // Validate field types
  validateTypes: (
    data: Record<string, any>,
    fieldTypes: Record<string, string>,
    requestId?: string
  ): void => {
    for (const [field, expectedType] of Object.entries(fieldTypes)) {
      if (data[field] !== undefined && typeof data[field] !== expectedType) {
        throw new ValidationError(
          `Field '${field}' must be of type ${expectedType}`,
          field,
          data[field],
          requestId
        );
      }
    }
  },

  // Create error from HTTP response
  fromHttpResponse: (
    response: Response,
    requestId?: string
  ): AppError => {
    const status = response.status;
    const statusText = response.statusText;

    if (status >= 500) {
      return new SystemError(`Server error: ${statusText}`, 'http', requestId);
    } else if (status === 404) {
      return new NotFoundError('Resource', undefined, requestId);
    } else if (status === 401) {
      return new AuthenticationError(`Authentication failed: ${statusText}`, requestId);
    } else if (status === 403) {
      return new AuthorizationError(`Access denied: ${statusText}`, undefined, requestId);
    } else if (status === 429) {
      return new RateLimitError(`Rate limit exceeded: ${statusText}`, undefined, undefined, requestId);
    } else {
      return new ValidationError(`Request failed: ${statusText}`, undefined, undefined, requestId);
    }
  }
};

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();