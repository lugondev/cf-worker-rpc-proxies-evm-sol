import { CORSConfig } from '../types';

export class CORSHandler {
  private config: CORSConfig;

  constructor(config: CORSConfig) {
    this.config = config;
  }

  /**
   * Check if CORS is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Check if origin is allowed
   */
  isOriginAllowed(origin: string | null): boolean {
    if (!origin || !this.config.enabled) {
      return false;
    }

    // Allow all origins if '*' is in the list
    if (this.config.allowedOrigins.includes('*')) {
      return true;
    }

    // Check if origin is in allowed list
    return this.config.allowedOrigins.includes(origin);
  }

  /**
   * Get CORS headers for a response
   */
  getCORSHeaders(requestOrigin: string | null): Record<string, string> {
    const headers: Record<string, string> = {};

    if (!this.config.enabled) {
      return headers;
    }

    // Set Access-Control-Allow-Origin
    if (this.config.allowedOrigins.includes('*')) {
      headers['Access-Control-Allow-Origin'] = '*';
    } else if (requestOrigin && this.isOriginAllowed(requestOrigin)) {
      headers['Access-Control-Allow-Origin'] = requestOrigin;
    }

    // Set other CORS headers
    if (this.config.allowedMethods.length > 0) {
      headers['Access-Control-Allow-Methods'] = this.config.allowedMethods.join(', ');
    }

    if (this.config.allowedHeaders.length > 0) {
      headers['Access-Control-Allow-Headers'] = this.config.allowedHeaders.join(', ');
    }

    if (this.config.exposedHeaders.length > 0) {
      headers['Access-Control-Expose-Headers'] = this.config.exposedHeaders.join(', ');
    }

    if (this.config.credentials) {
      headers['Access-Control-Allow-Credentials'] = 'true';
    }

    if (this.config.maxAge > 0) {
      headers['Access-Control-Max-Age'] = this.config.maxAge.toString();
    }

    return headers;
  }

  /**
   * Handle preflight OPTIONS request
   */
  handlePreflight(request: Request): Response {
    const origin = request.headers.get('Origin');
    const requestMethod = request.headers.get('Access-Control-Request-Method');
    const requestHeaders = request.headers.get('Access-Control-Request-Headers');

    // Check if origin is allowed
    if (!this.isOriginAllowed(origin)) {
      return new Response(null, { status: 403 });
    }

    // Check if method is allowed
    if (requestMethod && !this.config.allowedMethods.includes(requestMethod)) {
      return new Response(null, { status: 405 });
    }

    // Get CORS headers
    const corsHeaders = this.getCORSHeaders(origin);

    // Add specific preflight headers
    if (requestHeaders) {
      const requestedHeaders = requestHeaders.split(',').map(h => h.trim());
      const allowedRequestHeaders = requestedHeaders.filter(header => 
        this.config.allowedHeaders.some(allowed => 
          allowed.toLowerCase() === header.toLowerCase()
        )
      );
      
      if (allowedRequestHeaders.length > 0) {
        corsHeaders['Access-Control-Allow-Headers'] = allowedRequestHeaders.join(', ');
      }
    }

    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  /**
   * Add CORS headers to an existing response
   */
  addCORSHeaders(response: Response, requestOrigin: string | null): Response {
    if (!this.config.enabled) {
      return response;
    }

    const corsHeaders = this.getCORSHeaders(requestOrigin);
    
    // Create new response with CORS headers
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        ...corsHeaders
      }
    });

    return newResponse;
  }

  /**
   * Create a CORS-enabled response
   */
  createResponse(
    body: BodyInit | null, 
    init: ResponseInit = {}, 
    requestOrigin: string | null = null
  ): Response {
    const corsHeaders = this.getCORSHeaders(requestOrigin);
    
    return new Response(body, {
      ...init,
      headers: {
        ...init.headers,
        ...corsHeaders
      }
    });
  }
}

/**
 * Create default CORS configuration for development
 */
export function createDevelopmentCORSConfig(): CORSConfig {
  return {
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
}

/**
 * Create production CORS configuration with specific origins
 */
export function createProductionCORSConfig(allowedOrigins: string[]): CORSConfig {
  return {
    enabled: true,
    allowedOrigins,
    allowedMethods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin'
    ],
    exposedHeaders: [
      'Content-Type',
      'X-Request-ID'
    ],
    maxAge: 3600, // 1 hour
    credentials: false
  };
}