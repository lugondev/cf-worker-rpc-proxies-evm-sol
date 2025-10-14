/**
 * Response utilities for consistent API responses
 */

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: number;
  requestId?: string;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class ResponseBuilder {
  /**
   * Create a successful response
   */
  static success<T>(data: T, requestId?: string): Response {
    const response: APIResponse<T> = {
      success: true,
      data,
      timestamp: Date.now(),
      requestId
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  /**
   * Create an error response
   */
  static error(
    code: string,
    message: string,
    status: number = 400,
    details?: any,
    requestId?: string
  ): Response {
    const response: APIResponse = {
      success: false,
      error: {
        code,
        message,
        details
      },
      timestamp: Date.now(),
      requestId
    };

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
   * Create a paginated response
   */
  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
    requestId?: string
  ): Response {
    const response: PaginatedResponse<T> = {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        hasNext: (page * limit) < total,
        hasPrev: page > 1
      },
      timestamp: Date.now(),
      requestId
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  /**
   * Create a JSON-RPC response
   */
  static jsonRPC(result: any, id: string | number | null): Response {
    const response = {
      jsonrpc: '2.0',
      result,
      id
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  /**
   * Create a JSON-RPC error response
   */
  static jsonRPCError(
    code: number,
    message: string,
    id: string | number | null,
    data?: any
  ): Response {
    const response = {
      jsonrpc: '2.0',
      error: {
        code,
        message,
        data
      },
      id
    };

    return new Response(JSON.stringify(response), {
      status: 200, // JSON-RPC errors still return 200 status
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  /**
   * Create a CORS preflight response
   */
  static cors(): Response {
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
}

/**
 * Common error codes and messages
 */
export const ErrorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_API_KEY: 'INVALID_API_KEY',

  // Validation
  INVALID_REQUEST: 'INVALID_REQUEST',
  INVALID_CHAIN_ID: 'INVALID_CHAIN_ID',
  INVALID_RPC_URL: 'INVALID_RPC_URL',
  MISSING_PARAMETER: 'MISSING_PARAMETER',
  INVALID_JSON: 'INVALID_JSON',

  // RPC Errors
  RPC_NOT_FOUND: 'RPC_NOT_FOUND',
  RPC_UNAVAILABLE: 'RPC_UNAVAILABLE',
  RPC_TIMEOUT: 'RPC_TIMEOUT',
  RPC_ERROR: 'RPC_ERROR',
  NO_HEALTHY_RPC: 'NO_HEALTHY_RPC',

  // Configuration
  CONFIG_NOT_FOUND: 'CONFIG_NOT_FOUND',
  CONFIG_INVALID: 'CONFIG_INVALID',
  CHAIN_NOT_FOUND: 'CHAIN_NOT_FOUND',
  CHAIN_EXISTS: 'CHAIN_EXISTS',

  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMITED: 'RATE_LIMITED'
} as const;

/**
 * HTTP status codes
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
} as const;