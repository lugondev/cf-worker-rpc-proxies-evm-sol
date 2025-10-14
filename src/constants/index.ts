// Application Constants
export const APP_CONSTANTS = {
  // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
  },

  // Default Values
  DEFAULTS: {
    RPC_TIMEOUT: 5000,
    RPC_MAX_RETRIES: 3,
    RPC_PRIORITY: 1,
    ADMIN_PAGE_TITLE: 'RPC EVM Admin Interface',
    SIMPLE_ADMIN_PAGE_TITLE: 'Simple Admin Interface',
    CHAIN_ID: 1, // Ethereum mainnet
    MAX_RETRIES: 3,
    RETRY_BASE_DELAY: 1000, // 1 second
  },

  // Cache Configuration
  CACHE: {
    DEFAULT_TTL: 300, // 5 minutes
    MAX_SIZE: 1000,
    KEY_PREFIX: 'rpc-proxy',
    CONFIG_TTL: 3600, // 1 hour
    HEALTH_TTL: 60 // 1 minute
  },

  // API Endpoints
  API_ENDPOINTS: {
    ADMIN_BASE: '/admin',
    ADMIN_CHAINS: '/admin/chains',
    ADMIN_RPC: '/admin/rpc',
    ADMIN_CONFIG: '/admin/config',
    ADMIN_HEALTH: '/admin/health',
  },

  // UI Messages
  MESSAGES: {
    AUTH_SUCCESS: 'Authentication successful',
    AUTH_FAILED: 'Authentication failed',
    CHAIN_ADDED: 'Chain added successfully',
    CHAIN_UPDATED: 'Chain updated successfully',
    CHAIN_DELETED: 'Chain deleted successfully',
    RPC_ADDED: 'RPC added successfully',
    RPC_UPDATED: 'RPC status updated successfully',
    RPC_REMOVED: 'RPC removed successfully',
    INVALID_INPUT: 'Please fill all required fields',
    CONFIRM_DELETE_CHAIN: 'Are you sure you want to delete chain',
    CONFIRM_DELETE_RPC: 'Are you sure you want to remove RPC',
    NO_RPCS_FOUND: 'No RPCs found for this chain',
  },

  // CSS Classes and IDs
  UI_ELEMENTS: {
    CONTAINER: 'container',
    BUTTON: 'button',
    FORM: 'form',
    SECTION: 'section',
    CHAIN_CARD: 'chain-card',
    CHAINS_GRID: 'chains-grid',
    LOG_CONTAINER: 'log',
    STATUS_MESSAGE: 'status',
  },

  // Form Field IDs
  FORM_FIELDS: {
    API_KEY: 'apiKey',
    NEW_CHAIN_ID: 'newChainId',
    NEW_CHAIN_NAME: 'newChainName',
    NEW_CHAIN_SYMBOL: 'newChainSymbol',
    NEW_CHAIN_RPC: 'newChainRpc',
    EDIT_CHAIN_ID: 'editChainId',
    EDIT_CHAIN_NAME: 'editChainName',
    EDIT_CHAIN_SYMBOL: 'editChainSymbol',
    NEW_RPC_URL: 'newRpcUrl',
  },

  // Section IDs
  SECTIONS: {
    ADD_CHAIN: 'addChainSection',
    EDIT_CHAIN: 'editChainSection',
    RPC_MANAGEMENT: 'rpcManagementSection',
    RPC_CHAIN_INFO: 'rpcChainInfo',
    RPC_LIST: 'rpcList',
    AUTH_STATUS: 'authStatus',
    CHAINS_GRID: 'chainsGrid',
  },

  // Colors
  COLORS: {
    PRIMARY: '#007bff',
    SUCCESS: '#28a745',
    WARNING: '#ffc107',
    DANGER: '#dc3545',
    SECONDARY: '#6c757d',
    LIGHT: '#f8f9fa',
    DARK: '#343a40',
  },

  // Validation Rules
  VALIDATION: {
    MIN_CHAIN_ID: 1,
    MAX_CHAIN_ID: 999999,
    MIN_NAME_LENGTH: 2,
    MAX_NAME_LENGTH: 50,
    MIN_SYMBOL_LENGTH: 1,
    MAX_SYMBOL_LENGTH: 10,
    URL_PATTERN: /^https?:\/\/.+/,
  },

  // JSON-RPC Error Codes
  JSON_RPC_ERRORS: {
    PARSE_ERROR: -32700,
    INVALID_REQUEST: -32600,
    METHOD_NOT_FOUND: -32601,
    INVALID_PARAMS: -32602,
    INTERNAL_ERROR: -32603,
    CHAIN_NOT_SUPPORTED: -32001,
    NO_HEALTHY_RPCS: -32002,
  },
} as const;

// Convenience accessors
export const DEFAULT_MAX_RETRIES = APP_CONSTANTS.DEFAULTS.MAX_RETRIES;
export const DEFAULT_CHAIN_ID = APP_CONSTANTS.DEFAULTS.CHAIN_ID;
export const RETRY_BASE_DELAY = APP_CONSTANTS.DEFAULTS.RETRY_BASE_DELAY;

export type HttpStatus = typeof APP_CONSTANTS.HTTP_STATUS[keyof typeof APP_CONSTANTS.HTTP_STATUS];
export type ApiEndpoint = typeof APP_CONSTANTS.API_ENDPOINTS[keyof typeof APP_CONSTANTS.API_ENDPOINTS];
export type UIMessage = typeof APP_CONSTANTS.MESSAGES[keyof typeof APP_CONSTANTS.MESSAGES];