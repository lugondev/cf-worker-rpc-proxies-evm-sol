# RPC EVM Proxy

A high-performance Cloudflare Worker service that acts as a reverse proxy for EVM RPC endpoints with automatic failover, health monitoring, and load balancing.

## Features

- 🚀 **High Performance**: Built on Cloudflare Workers for global edge deployment
- 🔄 **Automatic Failover**: Intelligent RPC selection with retry mechanisms
- 🏥 **Health Monitoring**: Continuous health checks for all RPC endpoints
- ⚖️ **Load Balancing**: Weighted random selection based on priority and health
- 🔧 **Management API**: Full REST API for configuration and monitoring
- 🌐 **Multi-Chain Support**: Support for multiple EVM chains
- 📊 **Statistics**: Request tracking and performance metrics
- 🔒 **Secure**: API key authentication for management endpoints

## Supported Chains

- **Ethereum (1)** - ETH
- **Polygon (137)** - MATIC  
- **BNB Smart Chain (56)** - BNB
- **Arbitrum One (42161)** - ETH
- **Optimism (10)** - ETH
- **Solana Devnet (sol-dev)** - SOL
- **Solana Mainnet (sol-main)** - SOL

*Additional chains can be added via the management API*

## Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd rpc-evm-proxy
npm install
```

### 2. Configure Environment

Create a `.env` file or configure in Cloudflare Workers dashboard:

```env
ADMIN_API_KEY=your-secure-api-key-here
HEALTH_CHECK_INTERVAL=300000
```

### 3. Deploy to Cloudflare Workers

```bash
# Login to Cloudflare
npx wrangler login

# Deploy to production
npm run deploy

# Or deploy to staging
npm run deploy:staging
```

### 4. Test the Service

```bash
# Test RPC proxy
curl -X POST https://your-worker.workers.dev/rpc/1 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Check health
curl https://your-worker.workers.dev/health
```

## API Documentation

### RPC Proxy Endpoints

#### POST /rpc/{chainId}
Proxy JSON-RPC requests to EVM chains.

**Example:**
```bash
curl -X POST https://your-worker.workers.dev/rpc/1 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_getBalance",
    "params": ["0x742d35Cc6634C0532925a3b8D4C9db96c4b4Db45", "latest"],
    "id": 1
  }'
```

#### POST /rpc?chainId={chainId}
Alternative way to specify chain ID via query parameter.

### Management API

All management endpoints require authentication:
```
Authorization: Bearer YOUR_API_KEY
```

#### Configuration Management

- `GET /admin/config` - Get complete RPC configuration
- `PUT /admin/config` - Update entire configuration
- `POST /admin/config/reset` - Reset to default configuration

#### Chain Management

- `GET /admin/chains` - List all configured chains
- `GET /admin/chains/{chainId}` - Get specific chain configuration
- `PUT /admin/chains/{chainId}` - Update chain configuration
- `DELETE /admin/chains/{chainId}` - Remove chain configuration

#### RPC Endpoint Management

- `POST /admin/chains/{chainId}/rpcs` - Add RPC endpoint to chain
- `DELETE /admin/chains/{chainId}/rpcs` - Remove RPC endpoint
- `PUT /admin/rpcs/{chainId}/{rpcUrl}/status` - Update RPC status

#### Health Monitoring

- `GET /admin/health` - Get health status for all chains
- `GET /admin/health/{chainId}` - Get health status for specific chain
- `POST /admin/health/check` - Trigger manual health check

#### Statistics

- `GET /admin/stats` - Get proxy statistics and metrics

### Public Endpoints

- `GET /health` - Public health check (no authentication required)
- `GET /` - API documentation page

## Configuration

### Default Configuration

The service comes with pre-configured RPC endpoints for major EVM chains:

```json
{
  "chains": {
    "1": {
      "chainId": 1,
      "name": "Ethereum",
      "symbol": "ETH",
      "rpcs": [
        {
          "url": "https://eth.llamarpc.com",
          "name": "LlamaRPC",
          "priority": 1,
          "timeout": 5000,
          "maxRetries": 3,
          "isActive": true
        }
      ]
    }
  },
  "globalSettings": {
    "defaultTimeout": 5000,
    "defaultMaxRetries": 3,
    "healthCheckInterval": 300000
  }
}
```

### Adding Custom RPC Endpoints

```bash
curl -X POST https://your-worker.workers.dev/admin/chains/1/rpcs \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-custom-rpc.com",
    "name": "Custom RPC",
    "priority": 2,
    "timeout": 10000,
    "maxRetries": 2
  }'
```

## Development

### Local Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

### Project Structure

```
src/
├── config/           # Default configurations
├── routes/           # API route handlers
├── services/         # Business logic services
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
└── index.ts          # Main entry point
```

### Key Services

- **ProxyService**: Handles RPC request proxying and failover
- **HealthService**: Monitors RPC endpoint health
- **ConfigService**: Manages RPC configuration in KV storage
- **RPCSelector**: Implements weighted selection algorithms

## Monitoring and Observability

### Health Checks

The service automatically performs health checks every 5 minutes (configurable) by:

1. Sending `eth_blockNumber` requests to each RPC
2. Measuring response time and success rate
3. Updating health status in KV storage
4. Disabling unhealthy endpoints temporarily

### Metrics

Available metrics include:

- Request count per chain/RPC
- Average response times
- Success/failure rates
- Health check results
- Failover events

### Logging

The service provides structured logging with:

- Request IDs for tracing
- Chain ID and RPC URL context
- Performance metrics
- Error details

## Security

### API Key Authentication

Management endpoints are protected with API key authentication:

```bash
# Set in environment variables
ADMIN_API_KEY=your-very-secure-random-key-here
```

### CORS Configuration

The service includes proper CORS headers for web applications:

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

### Input Validation

All inputs are validated including:

- JSON-RPC request format
- Chain ID validation
- URL format validation
- Parameter sanitization

## Performance

### Caching Strategy

- Configuration cached in Cloudflare KV
- Health status cached with TTL
- Intelligent cache invalidation

### Request Routing

- Weighted random selection
- Priority-based routing
- Automatic failover
- Circuit breaker pattern

### Global Distribution

Deployed on Cloudflare's global edge network for:

- Low latency worldwide
- High availability
- DDoS protection
- Automatic scaling

## Troubleshooting

### Common Issues

1. **RPC Timeouts**
   - Check RPC endpoint health
   - Adjust timeout settings
   - Verify network connectivity

2. **Authentication Errors**
   - Verify API key configuration
   - Check Authorization header format

3. **Chain Not Found**
   - Ensure chain is configured
   - Check chain ID format

### Debug Mode

Enable debug logging by setting log level:

```typescript
import { logger, LogLevel } from './utils/logger';
logger.setLogLevel(LogLevel.DEBUG);
```

### Health Check Endpoint

Monitor service health:

```bash
curl https://your-worker.workers.dev/admin/health \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review the API documentation
3. Open an issue on GitHub
4. Contact the development team