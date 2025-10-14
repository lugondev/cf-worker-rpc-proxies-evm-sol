import { 
  Env, 
  JSONRPCRequest, 
  JSONRPCResponse, 
  ProxyContext, 
  RPCEndpoint, 
  ChainConfig,
  ErrorCode,
  HttpStatusCode
} from '../types';
import { ConfigService } from './config_service';
import { RPCSelector } from './rpc_selector';
import { CacheService } from './cache_service';
import { MetricsService, getMetricsService } from './metrics_service';
import { Logger, LogLevel } from '../utils/logger';
import { 
  errorHandler, 
  ValidationError, 
  NetworkError, 
  TimeoutError, 
  ChainNotSupportedError,
  SystemError 
} from '../utils/error_handler';
import { DEFAULT_MAX_RETRIES, RETRY_BASE_DELAY, DEFAULT_CHAIN_ID } from '../constants';

export class ProxyService {
  private configService: ConfigService;
  private logger: Logger;
  private cacheService: CacheService | null = null;
  private metricsService: MetricsService;

  constructor(env: Env, cache?: KVNamespace) {
    this.configService = new ConfigService(env);
    this.logger = Logger.getInstance(LogLevel.INFO, { service: 'proxy' });
    this.metricsService = getMetricsService(this.logger);
    if (cache) {
      this.cacheService = new CacheService(cache);
    }
  }

  async handleRequest(request: Request, env: Env): Promise<Response> {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    const url = new URL(request.url);
    
    // Log incoming request
    this.logger.logRequest(
      request.method,
      request.url,
      requestId,
      request.headers.get('user-agent') || undefined,
      request.headers.get('cf-connecting-ip') || undefined
    );
    
    try {
      // Parse and validate JSON-RPC request
      const body = await request.text();
      let jsonRPCRequest: JSONRPCRequest;
      
      try {
        jsonRPCRequest = JSON.parse(body);
      } catch (error) {
        const parseError = new ValidationError('Failed to parse JSON request');
        const handledError = errorHandler.handleError(parseError, requestId);
        return errorHandler.createErrorResponse(handledError);
      }

      if (!this.isValidJSONRPC(jsonRPCRequest)) {
        this.logger.warn('Invalid JSON-RPC request format', { requestId, request: jsonRPCRequest });
        return this.createErrorResponse(
          ErrorCode.INVALID_REQUEST, 
          'Invalid Request', 
          (jsonRPCRequest as any)?.id || null, 
          requestId
        );
      }

      // Extract chain ID from URL or request
      const chainId = this.extractChainId(request, jsonRPCRequest);
      if (!chainId) {
        this.logger.warn('Chain ID not found in request', { requestId, url: request.url });
        return this.createErrorResponse(
          ErrorCode.CHAIN_NOT_SUPPORTED, 
          'Chain not supported', 
          jsonRPCRequest.id, 
          requestId
        );
      }

      // Get chain configuration
      const chainConfig = await this.configService.getChainConfig(chainId);
      if (!chainConfig) {
        this.logger.warn('Chain configuration not found', { requestId, chainId });
        return this.createErrorResponse(
          ErrorCode.CHAIN_NOT_SUPPORTED, 
          'Chain not supported', 
          jsonRPCRequest.id, 
          requestId
        );
      }

      // Check for healthy RPCs
      const healthyRPCs = chainConfig.rpcs.filter(rpc => rpc.isActive);
      if (healthyRPCs.length === 0) {
        this.logger.error('No healthy RPCs available', { requestId, chainId });
        return this.createErrorResponse(
          ErrorCode.NO_HEALTHY_RPCS, 
          'No healthy RPCs available', 
          jsonRPCRequest.id, 
          requestId
        );
      }

      // Check cache first if available
      if (this.cacheService) {
        const cacheKey = `${chainId}:${jsonRPCRequest.method}:${JSON.stringify(jsonRPCRequest.params || [])}`;
        const cachedResponse = await this.cacheService.getCachedRPCResponse(
          chainId.toString(),
          jsonRPCRequest.method,
          jsonRPCRequest.params || []
        );
        
        if (cachedResponse) {
          this.logger.logCacheOperation('hit', cacheKey, 'proxy-service', undefined, requestId);
          this.logger.debug('Cache hit for RPC request', { 
            requestId, 
            method: jsonRPCRequest.method,
            chainId 
          });
          
          const headers = new Headers();
          headers.set('Content-Type', 'application/json');
          headers.set('X-Request-ID', requestId);
          headers.set('X-Cache', 'HIT');
          
          return new Response(JSON.stringify(cachedResponse), {
            status: 200,
            headers
          });
        } else {
          this.logger.logCacheOperation('miss', cacheKey, 'proxy-service', undefined, requestId);
        }
      }

      // Create proxy context
      const context: ProxyContext = {
        chainId,
        request: jsonRPCRequest,
        startTime,
        requestId
      };

      // Attempt proxy with retries
      const response = await this.proxyWithRetries(context, chainConfig);
      
      // Add request ID to response headers
      const headers = new Headers(response.headers);
      headers.set('X-Request-ID', requestId);
      
      // Log response and performance
      const duration = Date.now() - startTime;
      this.logger.logResponse(
        request.method,
        url.pathname,
        response.status,
        duration,
        requestId
      );
      
      this.logger.logPerformance(
        'proxy-request',
        duration,
        'proxy-service',
        requestId,
        { chainId, method: jsonRPCRequest.method }
      );
      
      // Record metrics
      this.metricsService.recordUsage(
        url.pathname,
        request.method,
        chainId,
        duration,
        response.status,
        request.headers.get('user-agent') || undefined,
        request.headers.get('cf-connecting-ip') || undefined
      );
      
      this.metricsService.recordPerformance(
        'proxy-request',
        duration,
        response.status < 400,
        'proxy-service',
        { chainId, method: jsonRPCRequest.method, statusCode: response.status }
      );
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });

    } catch (error) {
      this.logger.error('Unexpected error in handleRequest', { 
        requestId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      // Record error metrics
      this.metricsService.recordError(
        error instanceof Error ? error.constructor.name : 'UnknownError',
        'proxy-service',
        undefined,
        error instanceof Error ? error.message : 'Unknown error',
        { requestId, url: request.url }
      );
      
      const systemError = new SystemError('Internal error occurred during request processing');
      const handledError = errorHandler.handleError(systemError);
      return errorHandler.createErrorResponse(handledError);
    }
  }

  private async proxyWithRetries(
    context: ProxyContext, 
    chainConfig: ChainConfig, 
    maxRetries: number = DEFAULT_MAX_RETRIES
  ): Promise<Response> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Select RPC endpoint using static method
        const selectedRPC = RPCSelector.selectRPC(chainConfig);
        if (!selectedRPC) {
          throw new Error('No RPC endpoint available');
        }

        context.selectedRPC = selectedRPC;
        
        this.logger.debug('Attempting RPC call', { 
          requestId: context.requestId,
          attempt: attempt + 1, 
          maxRetries: maxRetries + 1,
          rpcUrl: selectedRPC.url,
          chainId: context.chainId 
        });

        // Make the actual RPC call
        const response = await this.makeRPCCall(context);
        
        if (response.ok) {
          const duration = Date.now() - context.startTime;
          this.logger.info('RPC call successful', { 
            requestId: context.requestId,
            chainId: context.chainId,
            rpcUrl: selectedRPC.url,
            duration,
            attempt: attempt + 1 
          });
          return response;
        } else {
          throw new Error(`RPC call failed with status: ${response.status}`);
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        this.logger.warn('RPC call attempt failed', { 
          requestId: context.requestId,
          attempt: attempt + 1, 
          maxRetries: maxRetries + 1,
          error: lastError.message,
          chainId: context.chainId 
        });

        // If this isn't the last attempt, wait before retrying
        if (attempt < maxRetries) {
          const delay = RETRY_BASE_DELAY * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    this.logger.error('All RPC retry attempts failed', { 
      requestId: context.requestId,
      chainId: context.chainId,
      maxRetries: maxRetries + 1,
      finalError: lastError?.message 
    });
    
    const networkError = new NetworkError(lastError?.message || 'All RPC endpoints failed');
    const handledError = errorHandler.handleError(networkError);
    return errorHandler.createErrorResponse(handledError);
  }

  private async makeRPCCall(context: ProxyContext): Promise<Response> {
    if (!context.selectedRPC) {
      throw new Error('No RPC endpoint selected');
    }

    const { selectedRPC, request } = context;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), selectedRPC.timeout);
    const callStartTime = Date.now();

    // Log external service call
    this.logger.logExternalCall(
      selectedRPC.name,
      'rpc-call',
      selectedRPC.url,
      'POST',
      undefined, // statusCode will be set after response
      undefined, // duration will be set after response
      context.requestId
    );

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add API key if available
      if (selectedRPC.apiKey) {
        headers['Authorization'] = `Bearer ${selectedRPC.apiKey}`;
      }

      const response = await fetch(selectedRPC.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Validate response is JSON-RPC
      if (response.headers.get('content-type')?.includes('application/json')) {
        const responseText = await response.text();
        try {
          const jsonResponse = JSON.parse(responseText);
          // Basic JSON-RPC response validation
          if (jsonResponse.jsonrpc === '2.0' && 'id' in jsonResponse) {
            // Cache successful response if cache service is available
            if (this.cacheService && !jsonResponse.error) {
              const cacheSetStartTime = Date.now();
              await this.cacheService.cacheRPCResponse(
                context.chainId.toString(),
                context.request.method,
                context.request.params || [],
                jsonResponse
              );
              
              const cacheSetDuration = Date.now() - cacheSetStartTime;
              const cacheKey = `${context.chainId}:${context.request.method}:${JSON.stringify(context.request.params || [])}`;
              this.logger.logCacheOperation('set', cacheKey, 'proxy-service', cacheSetDuration, context.requestId);
              
              this.logger.debug('Response cached', {
                requestId: context.requestId,
                method: context.request.method,
                chainId: context.chainId
              });
            }
            
            // Log successful external call
            const callDuration = Date.now() - callStartTime;
            this.logger.logExternalCall(
              selectedRPC.name,
              'rpc-call',
              selectedRPC.url,
              'POST',
              response.status,
              callDuration,
              context.requestId,
              true
            );
            
            return new Response(responseText, {
              status: response.status,
              headers: response.headers,
            });
          }
        } catch (parseError) {
          this.logger.warn('Invalid JSON response from RPC', { 
            requestId: context.requestId,
            rpcUrl: selectedRPC.url,
            parseError: parseError instanceof Error ? parseError.message : 'Unknown error' 
          });
        }
      }

      return response;

    } catch (error) {
      clearTimeout(timeoutId);
      
      // Log failed external call
      const callDuration = Date.now() - callStartTime;
      this.logger.logExternalCall(
        selectedRPC.name,
        'rpc-call',
        selectedRPC.url,
        'POST',
        undefined,
        callDuration,
        context.requestId,
        false
      );
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError(`Request timeout after ${selectedRPC.timeout}ms`);
      }
      
      throw error;
    }
  }

  private extractChainId(request: Request, jsonRPCRequest: JSONRPCRequest): number | string | null {
    const url = new URL(request.url);
    
    // Try to extract from URL path (e.g., /rpc/1, /1, /sol-dev, /sol-main)
    const pathMatch = url.pathname.match(/\/(?:rpc\/)?([^\/]+)/);
    if (pathMatch) {
      const chainIdStr = pathMatch[1];
      
      // Check if it's a number (EVM chains)
      const numericChainId = parseInt(chainIdStr, 10);
      if (!isNaN(numericChainId)) {
        return numericChainId;
      }
      
      // Return as string for non-numeric chain IDs (Solana chains)
      return chainIdStr;
    }
    
    // Try to extract from query parameters
    const chainIdParam = url.searchParams.get('chainId') || url.searchParams.get('chain');
    if (chainIdParam) {
      const numericChainId = parseInt(chainIdParam, 10);
      if (!isNaN(numericChainId)) {
        return numericChainId;
      }
      // Return as string for non-numeric chain IDs
      return chainIdParam;
    }
    
    // Try to extract from JSON-RPC params (if method supports it)
    if (jsonRPCRequest.params && Array.isArray(jsonRPCRequest.params)) {
      // Some methods might include chainId in params
      for (const param of jsonRPCRequest.params) {
        if (typeof param === 'object' && param !== null && 'chainId' in param) {
          const chainIdValue = param.chainId;
          const numericChainId = parseInt(String(chainIdValue), 10);
          if (!isNaN(numericChainId)) {
            return numericChainId;
          }
          // Return as string for non-numeric chain IDs
          return String(chainIdValue);
        }
      }
    }
    
    // Default fallback
    return DEFAULT_CHAIN_ID;
  }

  private isValidJSONRPC(request: any): request is JSONRPCRequest {
    return (
      request &&
      typeof request === 'object' &&
      request.jsonrpc === '2.0' &&
      typeof request.method === 'string' &&
      request.method.length > 0 &&
      ('id' in request) &&
      (request.id === null || 
       typeof request.id === 'string' || 
       typeof request.id === 'number')
    );
  }

  private createErrorResponse(
    code: ErrorCode | number, 
    message: string, 
    id: any, 
    requestId?: string
  ): Response {
    const errorResponse: JSONRPCResponse = {
      jsonrpc: '2.0',
      error: {
        code: typeof code === 'number' ? code : -32603, // Default to internal error
        message,
      },
      id,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (requestId) {
      headers['X-Request-ID'] = requestId;
    }

    return new Response(JSON.stringify(errorResponse), {
      status: HttpStatusCode.OK, // JSON-RPC errors are returned with 200 status
      headers,
    });
  }

  private logRequest(context: ProxyContext): void {
    this.logger.info('Processing RPC request', {
      requestId: context.requestId,
      chainId: context.chainId,
      method: context.request.method,
      id: context.request.id,
      timestamp: new Date(context.startTime).toISOString()
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}