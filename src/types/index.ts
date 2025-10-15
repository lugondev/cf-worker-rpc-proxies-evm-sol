/// <reference types="@cloudflare/workers-types" />

// Cloudflare Workers types are imported globally from @cloudflare/workers-types

// Environment configuration
export interface Env {
  RPC_CONFIG: KVNamespace;
  RPC_HEALTH: KVNamespace;
  RPC_CACHE?: KVNamespace; // Optional cache namespace
  ADMIN_API_KEY: string;
  HEALTH_CHECK_INTERVAL: string;
  DEBUG?: string;
}

// RPC endpoint configuration
export interface RPCEndpoint {
  url: string;
  name: string;
  priority: number; // Higher priority = more likely to be selected
  timeout: number; // Request timeout in milliseconds
  maxRetries: number;
  isActive: boolean;
  apiKey?: string; // Optional API key for authenticated endpoints
}

// Chain configuration
export interface ChainConfig {
  chainId: number | string;
  name: string;
  symbol: string;
  rpcs: RPCEndpoint[];
  blockExplorerUrl?: string;
}

// CORS configuration
export interface CORSConfig {
  enabled: boolean;
  allowedOrigins: string[]; // List of allowed origins, or ['*'] for all
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  maxAge: number; // Preflight cache duration in seconds
  credentials: boolean;
}

// Complete RPC configuration
export interface RPCConfig {
  chains: Record<string, ChainConfig>;
  globalSettings: {
    defaultTimeout: number;
    defaultMaxRetries: number;
    healthCheckInterval: number;
  };
  cors: CORSConfig;
}

// Health check result
export interface HealthCheckResult {
  url: string;
  chainId: number | string;
  isHealthy: boolean;
  responseTime: number;
  lastChecked: number;
  error?: string;
  blockNumber?: number;
}

// JSON-RPC types
export interface JSONRPCRequest {
  jsonrpc: string;
  method: string;
  params?: any[];
  id: string | number;
}

export interface JSONRPCResponse {
  jsonrpc: string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number;
}

// Proxy context for request handling
export interface ProxyContext {
  chainId: number | string;
  request: JSONRPCRequest;
  selectedRPC?: RPCEndpoint;
  startTime: number;
  requestId?: string; // Optional request ID for tracking
}

// Management API response
export interface ManagementResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

// Health status summary
export interface HealthSummary {
  totalChains: number;
  totalRPCs: number;
  healthyRPCs: number;
  unhealthyRPCs: number;
  lastUpdated: number;
  chains: Record<string, {
    chainId: number | string;
    name: string;
    totalRPCs: number;
    healthyRPCs: number;
    avgResponseTime: number;
  }>;
}

// Additional type definitions for better type safety

// HTTP Status codes enum
export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504
}

// Error codes for consistent error handling
// Enhanced ErrorCode enum with JSON-RPC specific codes
export enum ErrorCode {
  // General validation errors
  INVALID_REQUEST = 'INVALID_REQUEST',
  MISSING_PARAMETER = 'MISSING_PARAMETER',
  INVALID_CHAIN_ID = 'INVALID_CHAIN_ID',
  INVALID_RPC_URL = 'INVALID_RPC_URL',
  CHAIN_NOT_FOUND = 'CHAIN_NOT_FOUND',
  RPC_NOT_FOUND = 'RPC_NOT_FOUND',
  HEALTH_CHECK_FAILED = 'HEALTH_CHECK_FAILED',
  CONFIG_SAVE_FAILED = 'CONFIG_SAVE_FAILED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  
  // JSON-RPC specific error codes (as numbers for compatibility)
  PARSE_ERROR = -32700,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  CHAIN_NOT_SUPPORTED = -32001,
  NO_HEALTHY_RPCS = -32002,
}

// JSON-RPC method types for better type safety
export type JSONRPCMethod = 
  // Ethereum/EVM methods
  | 'eth_blockNumber'
  | 'eth_getBalance'
  | 'eth_getTransactionCount'
  | 'eth_getBlockByNumber'
  | 'eth_getBlockByHash'
  | 'eth_getTransactionByHash'
  | 'eth_getTransactionReceipt'
  | 'eth_call'
  | 'eth_estimateGas'
  | 'eth_sendRawTransaction'
  | 'eth_getLogs'
  | 'eth_chainId'
  | 'net_version'
  | 'web3_clientVersion'
  // Solana methods
  | 'getAccountInfo'
  | 'getBalance'
  | 'getBlockHeight'
  | 'getBlockTime'
  | 'getClusterNodes'
  | 'getEpochInfo'
  | 'getHealth'
  | 'getIdentity'
  | 'getInflationGovernor'
  | 'getInflationRate'
  | 'getLatestBlockhash'
  | 'getLeaderSchedule'
  | 'getMinimumBalanceForRentExemption'
  | 'getMultipleAccounts'
  | 'getProgramAccounts'
  | 'getRecentBlockhash'
  | 'getSignatureStatuses'
  | 'getSlot'
  | 'getSlotLeader'
  | 'getSlotLeaders'
  | 'getStakeActivation'
  | 'getSupply'
  | 'getTokenAccountBalance'
  | 'getTokenAccountsByDelegate'
  | 'getTokenAccountsByOwner'
  | 'getTokenLargestAccounts'
  | 'getTokenSupply'
  | 'getTransaction'
  | 'getTransactionCount'
  | 'getVersion'
  | 'getVoteAccounts'
  | 'requestAirdrop'
  | 'sendTransaction'
  | 'simulateTransaction'
  | string; // Allow other methods

// Typed JSON-RPC request with specific method
export interface TypedJSONRPCRequest<T extends JSONRPCMethod = JSONRPCMethod> {
  jsonrpc: '2.0';
  method: T;
  params?: any[];
  id: string | number;
}

// Configuration update request types
export interface ConfigUpdateRequest {
  chains?: Partial<Record<string, ChainConfig>>;
  globalSettings?: Partial<RPCConfig['globalSettings']>;
}

export interface ChainConfigUpdateRequest extends Partial<ChainConfig> {
  chainId: number | string;
}

export interface RPCEndpointUpdateRequest extends Partial<RPCEndpoint> {
  url: string;
}

// Health check configuration
export interface HealthCheckConfig {
  interval: number; // in milliseconds
  timeout: number; // in milliseconds
  retries: number;
  methods: JSONRPCMethod[];
}

// Statistics and metrics types
export interface RPCMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastRequestTime: number;
  errorRate: number;
}

export interface ChainMetrics {
  chainId: number | string;
  name: string;
  totalRequests: number;
  activeRPCs: number;
  healthyRPCs: number;
  averageResponseTime: number;
  rpcs: Record<string, RPCMetrics>;
}

export interface SystemStats {
  uptime: number;
  totalChains: number;
  totalRPCs: number;
  activeRPCs: number;
  healthyRPCs: number;
  totalRequests: number;
  requestsPerMinute: number;
  averageResponseTime: number;
  errorRate: number;
  lastHealthCheck: number;
  chains: Record<string, ChainMetrics>;
}

// Admin UI component types
export interface AdminUIConfig {
  title: string;
  theme: 'light' | 'dark';
  refreshInterval: number;
  showDebugInfo: boolean;
}

// Route handler types
export type RouteHandler = (request: Request, ...args: any[]) => Promise<Response>;

export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS';
  path: string;
  handler: RouteHandler;
  requiresAuth?: boolean;
}

// Validation result types
export interface ValidationResult<T = any> {
  isValid: boolean;
  data?: T;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: ErrorCode;
  value?: any;
}

// Cache types for performance optimization
export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number; // time to live in milliseconds
}

export interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  keyPrefix: string;
  configTTL?: number;
  healthTTL?: number;
  cleanupInterval: number;
}

// Event types for logging and monitoring
export interface RequestEvent {
  requestId: string;
  method: string;
  chainId: number | string;
  rpcUrl: string;
  startTime: number;
  endTime?: number;
  success?: boolean;
  error?: string;
  responseTime?: number;
}

export interface HealthCheckEvent {
  chainId: number | string;
  rpcUrl: string;
  timestamp: number;
  success: boolean;
  responseTime: number;
  blockNumber?: number;
  error?: string;
}

export interface ConfigChangeEvent {
  timestamp: number;
  action: 'create' | 'update' | 'delete' | 'reset';
  target: 'chain' | 'rpc' | 'global' | 'config';
  targetId?: string | number;
  changes: Record<string, any>;
  requestId?: string;
}