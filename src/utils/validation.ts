import { 
  JSONRPCRequest, 
  RPCEndpoint, 
  ChainConfig,
  ErrorCode,
  ValidationResult,
  ValidationError as ValidationErrorType,
  JSONRPCMethod,
  TypedJSONRPCRequest
} from '../types';

export class ValidationError extends Error {
  public readonly code: ErrorCode;
  public readonly field?: string;
  public readonly value?: any;

  constructor(message: string, code: ErrorCode = ErrorCode.INVALID_REQUEST, field?: string, value?: any) {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
    this.field = field;
    this.value = value;
  }
}

export class Validator {
  /**
   * Validates chain ID
   */
  static validateChainId(chainId: any): number {
    if (typeof chainId === 'string') {
      const parsed = parseInt(chainId, 10);
      if (isNaN(parsed)) {
        throw new ValidationError(
          `Invalid chain ID: ${chainId}`,
          ErrorCode.INVALID_CHAIN_ID,
          'chainId',
          chainId
        );
      }
      chainId = parsed;
    }

    if (typeof chainId !== 'number' || chainId <= 0 || !Number.isInteger(chainId)) {
      throw new ValidationError(
        `Chain ID must be a positive integer, got: ${chainId}`,
        ErrorCode.INVALID_CHAIN_ID,
        'chainId',
        chainId
      );
    }

    return chainId;
  }

  /**
   * Validates RPC URL format
   */
  static validateRPCUrl(url: any): string {
    if (typeof url !== 'string' || !url.trim()) {
      throw new ValidationError(
        'RPC URL must be a non-empty string',
        ErrorCode.INVALID_RPC_URL,
        'url',
        url
      );
    }

    const trimmedUrl = url.trim();
    
    try {
      const urlObj = new URL(trimmedUrl);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new ValidationError(
          'RPC URL must use HTTP or HTTPS protocol',
          ErrorCode.INVALID_RPC_URL,
          'url',
          url
        );
      }
      return trimmedUrl;
    } catch (error) {
      throw new ValidationError(
        `Invalid RPC URL format: ${trimmedUrl}`,
        ErrorCode.INVALID_RPC_URL,
        'url',
        url
      );
    }
  }

  /**
   * Validates API key
   */
  static validateApiKey(apiKey: any, expectedKey: string): void {
    if (typeof apiKey !== 'string' || !apiKey.trim()) {
      throw new ValidationError(
        'API key is required',
        ErrorCode.UNAUTHORIZED_ACCESS,
        'apiKey'
      );
    }

    if (apiKey.trim() !== expectedKey) {
      throw new ValidationError(
        'Invalid API key',
        ErrorCode.UNAUTHORIZED_ACCESS,
        'apiKey'
      );
    }
  }

  /**
   * Validates JSON-RPC request structure
   */
  static validateJSONRPCRequest(request: any): ValidationResult<JSONRPCRequest> {
    const errors: ValidationErrorType[] = [];

    if (!request || typeof request !== 'object') {
      errors.push({
        field: 'request',
        message: 'Request must be an object',
        code: ErrorCode.INVALID_REQUEST,
        value: request
      });
      return { isValid: false, errors };
    }

    // Validate jsonrpc version
    if (request.jsonrpc !== '2.0') {
      errors.push({
        field: 'jsonrpc',
        message: 'JSON-RPC version must be "2.0"',
        code: ErrorCode.INVALID_REQUEST,
        value: request.jsonrpc
      });
    }

    // Validate method
    if (typeof request.method !== 'string' || !request.method.trim()) {
      errors.push({
        field: 'method',
        message: 'Method must be a non-empty string',
        code: ErrorCode.INVALID_REQUEST,
        value: request.method
      });
    }

    // Validate id
    if (request.id === undefined || request.id === null) {
      errors.push({
        field: 'id',
        message: 'ID is required',
        code: ErrorCode.MISSING_PARAMETER,
        value: request.id
      });
    } else if (typeof request.id !== 'string' && typeof request.id !== 'number') {
      errors.push({
        field: 'id',
        message: 'ID must be a string or number',
        code: ErrorCode.INVALID_REQUEST,
        value: request.id
      });
    }

    // Validate params (optional)
    if (request.params !== undefined && !Array.isArray(request.params)) {
      errors.push({
        field: 'params',
        message: 'Params must be an array if provided',
        code: ErrorCode.INVALID_REQUEST,
        value: request.params
      });
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    return {
      isValid: true,
      data: {
        jsonrpc: request.jsonrpc,
        method: request.method,
        params: request.params,
        id: request.id
      }
    };
  }

  /**
   * Validates RPC endpoint configuration
   */
  static validateRPCEndpoint(endpoint: any): ValidationResult<RPCEndpoint> {
    const errors: ValidationErrorType[] = [];

    if (!endpoint || typeof endpoint !== 'object') {
      errors.push({
        field: 'endpoint',
        message: 'Endpoint must be an object',
        code: ErrorCode.INVALID_REQUEST,
        value: endpoint
      });
      return { isValid: false, errors };
    }

    // Validate URL
    try {
      this.validateRPCUrl(endpoint.url);
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push({
          field: 'url',
          message: error.message,
          code: error.code,
          value: endpoint.url
        });
      }
    }

    // Validate name
    if (typeof endpoint.name !== 'string' || !endpoint.name.trim()) {
      errors.push({
        field: 'name',
        message: 'Name must be a non-empty string',
        code: ErrorCode.INVALID_REQUEST,
        value: endpoint.name
      });
    }

    // Validate priority
    if (typeof endpoint.priority !== 'number' || endpoint.priority < 0) {
      errors.push({
        field: 'priority',
        message: 'Priority must be a non-negative number',
        code: ErrorCode.INVALID_REQUEST,
        value: endpoint.priority
      });
    }

    // Validate timeout
    if (typeof endpoint.timeout !== 'number' || endpoint.timeout <= 0) {
      errors.push({
        field: 'timeout',
        message: 'Timeout must be a positive number',
        code: ErrorCode.INVALID_REQUEST,
        value: endpoint.timeout
      });
    }

    // Validate maxRetries
    if (typeof endpoint.maxRetries !== 'number' || endpoint.maxRetries < 0 || !Number.isInteger(endpoint.maxRetries)) {
      errors.push({
        field: 'maxRetries',
        message: 'MaxRetries must be a non-negative integer',
        code: ErrorCode.INVALID_REQUEST,
        value: endpoint.maxRetries
      });
    }

    // Validate isActive
    if (typeof endpoint.isActive !== 'boolean') {
      errors.push({
        field: 'isActive',
        message: 'IsActive must be a boolean',
        code: ErrorCode.INVALID_REQUEST,
        value: endpoint.isActive
      });
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    return {
      isValid: true,
      data: {
        url: endpoint.url.trim(),
        name: endpoint.name.trim(),
        priority: endpoint.priority,
        timeout: endpoint.timeout,
        maxRetries: endpoint.maxRetries,
        isActive: endpoint.isActive
      }
    };
  }

  /**
   * Validates chain configuration
   */
  static validateChainConfig(config: any): ValidationResult<ChainConfig> {
    const errors: ValidationErrorType[] = [];

    if (!config || typeof config !== 'object') {
      errors.push({
        field: 'config',
        message: 'Config must be an object',
        code: ErrorCode.INVALID_REQUEST,
        value: config
      });
      return { isValid: false, errors };
    }

    // Validate chainId
    try {
      this.validateChainId(config.chainId);
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push({
          field: 'chainId',
          message: error.message,
          code: error.code,
          value: config.chainId
        });
      }
    }

    // Validate name
    if (typeof config.name !== 'string' || !config.name.trim()) {
      errors.push({
        field: 'name',
        message: 'Name must be a non-empty string',
        code: ErrorCode.INVALID_REQUEST,
        value: config.name
      });
    }

    // Validate symbol
    if (typeof config.symbol !== 'string' || !config.symbol.trim()) {
      errors.push({
        field: 'symbol',
        message: 'Symbol must be a non-empty string',
        code: ErrorCode.INVALID_REQUEST,
        value: config.symbol
      });
    }

    // Validate rpcs
    if (!Array.isArray(config.rpcs)) {
      errors.push({
        field: 'rpcs',
        message: 'RPCs must be an array',
        code: ErrorCode.INVALID_REQUEST,
        value: config.rpcs
      });
    } else {
      config.rpcs.forEach((rpc: any, index: number) => {
        const rpcValidation = this.validateRPCEndpoint(rpc);
        if (!rpcValidation.isValid && rpcValidation.errors) {
          rpcValidation.errors.forEach(error => {
            errors.push({
              ...error,
              field: `rpcs[${index}].${error.field}`
            });
          });
        }
      });
    }

    // Validate blockExplorerUrl (optional)
    if (config.blockExplorerUrl !== undefined) {
      try {
        new URL(config.blockExplorerUrl);
      } catch {
        errors.push({
          field: 'blockExplorerUrl',
          message: 'Block explorer URL must be a valid URL',
          code: ErrorCode.INVALID_REQUEST,
          value: config.blockExplorerUrl
        });
      }
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    const validatedRpcs: RPCEndpoint[] = [];
    config.rpcs.forEach((rpc: any) => {
      const rpcValidation = this.validateRPCEndpoint(rpc);
      if (rpcValidation.isValid && rpcValidation.data) {
        validatedRpcs.push(rpcValidation.data);
      }
    });

    return {
      isValid: true,
      data: {
        chainId: this.validateChainId(config.chainId),
        name: config.name.trim(),
        symbol: config.symbol.trim(),
        rpcs: validatedRpcs,
        blockExplorerUrl: config.blockExplorerUrl
      }
    };
  }

  /**
   * Validates JSON-RPC method
   */
  static validateJSONRPCMethod(method: any): JSONRPCMethod {
    if (typeof method !== 'string' || !method.trim()) {
      throw new ValidationError(
        'JSON-RPC method must be a non-empty string',
        ErrorCode.INVALID_REQUEST,
        'method',
        method
      );
    }

    return method.trim() as JSONRPCMethod;
  }

  /**
   * Creates a typed JSON-RPC request with validation
   */
  static createTypedJSONRPCRequest<T extends JSONRPCMethod>(
    method: T,
    params?: any[],
    id?: string | number
  ): TypedJSONRPCRequest<T> {
    const validatedMethod = this.validateJSONRPCMethod(method) as T;
    const requestId = id ?? Math.random().toString(36).substring(2);

    return {
      jsonrpc: '2.0',
      method: validatedMethod,
      params: params || [],
      id: requestId
    };
  }

  /**
   * Validates request timeout value
   */
  static validateTimeout(timeout: any): number {
    if (typeof timeout === 'string') {
      const parsed = parseInt(timeout, 10);
      if (isNaN(parsed)) {
        throw new ValidationError(
          `Invalid timeout value: ${timeout}`,
          ErrorCode.INVALID_REQUEST,
          'timeout',
          timeout
        );
      }
      timeout = parsed;
    }

    if (typeof timeout !== 'number' || timeout <= 0) {
      throw new ValidationError(
        'Timeout must be a positive number',
        ErrorCode.INVALID_REQUEST,
        'timeout',
        timeout
      );
    }

    return timeout;
  }

  /**
   * Validates priority value
   */
  static validatePriority(priority: any): number {
    if (typeof priority === 'string') {
      const parsed = parseInt(priority, 10);
      if (isNaN(parsed)) {
        throw new ValidationError(
          `Invalid priority value: ${priority}`,
          ErrorCode.INVALID_REQUEST,
          'priority',
          priority
        );
      }
      priority = parsed;
    }

    if (typeof priority !== 'number' || priority < 0) {
      throw new ValidationError(
        'Priority must be a non-negative number',
        ErrorCode.INVALID_REQUEST,
        'priority',
        priority
      );
    }

    return priority;
  }
}