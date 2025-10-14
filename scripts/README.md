# Scripts

This folder contains utility scripts for managing the RPC proxy configuration.

## update-config.js

A Node.js script to update RPC configuration via API calls.

### Features

- 🎯 **Smart URL Detection**: Automatically detects target environment
- 📁 **Config File Validation**: Checks if `new_config.json` exists
- ✅ **Verification**: Automatically verifies the update by listing chains
- 🔍 **Error Handling**: Comprehensive error reporting
- 📊 **Detailed Output**: Shows configuration summary and chain counts

### Usage

#### Quick Commands

```bash
# Auto-detect URL (defaults to production)
npm run update-config

# Update local development server
npm run update-config:local

# Update production server
npm run update-config:prod
```

#### Manual URL

```bash
# Custom URL
npm run update-config http://localhost:8787
npm run update-config https://your-custom-domain.com
```

#### Help

```bash
npm run update-config -- --help
```

### URL Detection Logic

1. **Command Line Argument**: If URL is provided as argument
2. **Environment Variable**: `RPC_PROXY_URL` if set
3. **Development Mode**: `http://localhost:8787` if `NODE_ENV=development`
4. **Default**: `https://rpc-evm-proxy.zzitorez.workers.dev` (production)

### Environment Variables

- `RPC_PROXY_URL`: Override default URL detection
- `NODE_ENV`: If set to 'development', defaults to localhost

### Configuration

- **Config File**: `new_config.json` (must exist in project root)
- **API Key**: `admin123` (hardcoded for simplicity)

### Example Output

```
🚀 RPC Configuration Updater
🎯 Target URL: http://localhost:8787
🔑 API Key: admin123

🔄 Updating configuration on: http://localhost:8787
📁 Using config file: new_config.json
✅ Configuration updated successfully!
📊 Response: { success: true, data: { message: 'Configuration updated successfully' } }

🔍 Verifying configuration...
✅ Verification successful!
📋 Available chains: [
  { chainId: 1, name: 'Ethereum Mainnet', symbol: 'ETH', rpcCount: 3, activeRpcCount: 3 },
  { chainId: 'sol-dev', name: 'Solana Devnet', symbol: 'SOL', rpcCount: 2, activeRpcCount: 2 },
  { chainId: 'sol-main', name: 'Solana Mainnet', symbol: 'SOL', rpcCount: 4, activeRpcCount: 4 }
]
```

### Error Handling

The script handles various error scenarios:

- ❌ Missing configuration file
- ❌ Network errors
- ❌ API authentication failures
- ❌ Invalid JSON responses
- ⚠️ Verification failures (non-fatal)

### Integration

This script can be integrated into CI/CD pipelines:

```bash
# Deploy and update config in one go
npm run deploy && npm run update-config:prod
```