#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script to update RPC configuration via API
 * Usage: npm run update-config [url]
 * If no URL provided, will try to detect from environment or use default
 */

const CONFIG_FILE = 'new_config.json';
const DEFAULT_LOCAL_URL = 'http://localhost:8787';
const DEFAULT_PRODUCTION_URL = 'https://rpc-evm-proxy.zzitorez.workers.dev';
const API_KEY = 'admin123';

async function updateConfig(baseUrl) {
  try {
    // Check if config file exists
    const configPath = path.join(process.cwd(), CONFIG_FILE);
    if (!fs.existsSync(configPath)) {
      console.error(`❌ Configuration file not found: ${CONFIG_FILE}`);
      process.exit(1);
    }

    // Read config file
    const configData = fs.readFileSync(configPath, 'utf8');
    
    console.log(`🔄 Updating configuration on: ${baseUrl}`);
    console.log(`📁 Using config file: ${CONFIG_FILE}`);

    // Make API request
    const response = await fetch(`${baseUrl}/config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: configData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Failed to update config: ${response.status} ${response.statusText}`);
      console.error(`Response: ${errorText}`);
      process.exit(1);
    }

    const result = await response.json();
    console.log(`✅ Configuration updated successfully!`);
    console.log(`📊 Response:`, result);

    // Verify by getting chains list
    console.log(`\n🔍 Verifying configuration...`);
    const chainsResponse = await fetch(`${baseUrl}/admin/chains`, {
      headers: {
        'X-API-Key': API_KEY
      }
    });

    if (chainsResponse.ok) {
      const chains = await chainsResponse.json();
      console.log(`✅ Verification successful!`);
      console.log(`📋 Available chains:`, chains.data.map(chain => ({
        chainId: chain.chainId,
        name: chain.name,
        symbol: chain.symbol,
        rpcCount: chain.rpcCount,
        activeRpcCount: chain.activeRpcCount
      })));
    } else {
      console.warn(`⚠️  Could not verify configuration: ${chainsResponse.status}`);
    }

  } catch (error) {
    console.error(`❌ Error updating configuration:`, error.message);
    process.exit(1);
  }
}

function detectUrl() {
  // Check command line arguments
  const args = process.argv.slice(2);
  if (args.length > 0) {
    return args[0];
  }

  // Check environment variables
  if (process.env.RPC_PROXY_URL) {
    return process.env.RPC_PROXY_URL;
  }

  // Check if development server is likely running
  if (process.env.NODE_ENV === 'development') {
    return DEFAULT_LOCAL_URL;
  }

  // Default to production
  return DEFAULT_PRODUCTION_URL;
}

function showUsage() {
  console.log(`
📖 Usage: npm run update-config [url]

Examples:
  npm run update-config                                    # Auto-detect URL
  npm run update-config http://localhost:8787             # Local development
  npm run update-config https://rpc-evm-proxy.zzitorez.workers.dev  # Production

Environment Variables:
  RPC_PROXY_URL    - Override default URL detection
  NODE_ENV         - If 'development', defaults to localhost

Configuration:
  - Config file: ${CONFIG_FILE}
  - API Key: ${API_KEY}
`);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showUsage();
    return;
  }

  const url = detectUrl();
  console.log(`🚀 RPC Configuration Updater`);
  console.log(`🎯 Target URL: ${url}`);
  console.log(`🔑 API Key: ${API_KEY}`);
  console.log('');

  await updateConfig(url);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { updateConfig, detectUrl };