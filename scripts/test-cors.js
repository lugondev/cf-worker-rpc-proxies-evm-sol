/**
 * Script to test CORS configuration
 * Usage: node scripts/test-cors.js [worker-url]
 */

const WORKER_URL = process.argv[2] || 'http://localhost:8787';

/**
 * Test CORS preflight request
 */
async function testPreflightRequest(origin = 'https://example.com') {
  console.log(`\n🔍 Testing CORS preflight request from origin: ${origin}`);
  
  try {
    const response = await fetch(WORKER_URL, {
      method: 'OPTIONS',
      headers: {
        'Origin': origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });

    console.log(`Status: ${response.status}`);
    console.log('CORS Headers:');
    
    const corsHeaders = [
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Methods', 
      'Access-Control-Allow-Headers',
      'Access-Control-Max-Age',
      'Access-Control-Allow-Credentials'
    ];

    corsHeaders.forEach(header => {
      const value = response.headers.get(header);
      if (value) {
        console.log(`  ${header}: ${value}`);
      }
    });

    return response.status === 204 || response.status === 200;
  } catch (error) {
    console.error(`❌ Preflight test failed:`, error.message);
    return false;
  }
}

/**
 * Test actual CORS request
 */
async function testCORSRequest(origin = 'https://example.com') {
  console.log(`\n🔍 Testing actual CORS request from origin: ${origin}`);
  
  try {
    const response = await fetch(`${WORKER_URL}/admin/cors/status`, {
      method: 'GET',
      headers: {
        'Origin': origin,
        'Content-Type': 'application/json'
      }
    });

    console.log(`Status: ${response.status}`);
    
    const allowOrigin = response.headers.get('Access-Control-Allow-Origin');
    const allowMethods = response.headers.get('Access-Control-Allow-Methods');
    const allowHeaders = response.headers.get('Access-Control-Allow-Headers');
    
    console.log('CORS Response Headers:');
    if (allowOrigin) console.log(`  Access-Control-Allow-Origin: ${allowOrigin}`);
    if (allowMethods) console.log(`  Access-Control-Allow-Methods: ${allowMethods}`);
    if (allowHeaders) console.log(`  Access-Control-Allow-Headers: ${allowHeaders}`);

    if (response.ok) {
      const data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2));
    }

    return response.ok;
  } catch (error) {
    console.error(`❌ CORS request test failed:`, error.message);
    return false;
  }
}

/**
 * Test multiple origins
 */
async function testMultipleOrigins() {
  const origins = [
    'https://example.com',
    'https://localhost:3000',
    'https://app.example.com',
    'http://localhost:8080',
    'https://different-domain.com'
  ];

  console.log('\n🌐 Testing multiple origins...');
  
  for (const origin of origins) {
    console.log(`\n--- Testing origin: ${origin} ---`);
    
    const preflightSuccess = await testPreflightRequest(origin);
    const requestSuccess = await testCORSRequest(origin);
    
    const status = (preflightSuccess && requestSuccess) ? '✅ PASS' : '❌ FAIL';
    console.log(`Result: ${status}`);
  }
}

/**
 * Enable allow-all CORS
 */
async function enableAllowAllCORS() {
  console.log('\n🔧 Enabling allow-all CORS...');
  
  try {
    const response = await fetch(`${WORKER_URL}/admin/cors/enable-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Allow-all CORS enabled successfully');
      console.log('Response:', JSON.stringify(data, null, 2));
      return true;
    } else {
      console.error('❌ Failed to enable allow-all CORS');
      console.error('Status:', response.status);
      const text = await response.text();
      console.error('Response:', text);
      return false;
    }
  } catch (error) {
    console.error('❌ Error enabling allow-all CORS:', error.message);
    return false;
  }
}

/**
 * Get current CORS status
 */
async function getCORSStatus() {
  console.log('\n📊 Getting current CORS status...');
  
  try {
    const response = await fetch(`${WORKER_URL}/admin/cors/status`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Current CORS Configuration:');
      console.log(JSON.stringify(data, null, 2));
      return data;
    } else {
      console.error('❌ Failed to get CORS status');
      console.error('Status:', response.status);
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting CORS status:', error.message);
    return null;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting CORS tests...');
  console.log(`Worker URL: ${WORKER_URL}`);
  
  // Get current status
  await getCORSStatus();
  
  // Test current configuration
  console.log('\n📋 Testing current CORS configuration...');
  await testPreflightRequest();
  await testCORSRequest();
  
  // Enable allow-all CORS
  const enabled = await enableAllowAllCORS();
  
  if (enabled) {
    // Wait a moment for config to propagate
    console.log('\n⏳ Waiting for configuration to propagate...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test with allow-all configuration
    console.log('\n📋 Testing with allow-all CORS configuration...');
    await testMultipleOrigins();
    
    // Get final status
    await getCORSStatus();
  }
  
  console.log('\n✅ CORS tests completed!');
}

/**
 * Show usage information
 */
function showUsage() {
  console.log(`
Usage: node scripts/test-cors.js [worker-url]

Examples:
  node scripts/test-cors.js
  node scripts/test-cors.js http://localhost:8787
  node scripts/test-cors.js https://your-worker.your-subdomain.workers.dev

This script will:
1. Get current CORS configuration
2. Test CORS with current settings
3. Enable allow-all CORS configuration
4. Test CORS with multiple origins
5. Show final configuration status
`);
}

// Run tests if called directly
if (require.main === module) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showUsage();
  } else {
    runTests().catch(error => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
  }
}

module.exports = {
  testPreflightRequest,
  testCORSRequest,
  testMultipleOrigins,
  enableAllowAllCORS,
  getCORSStatus,
  runTests
};