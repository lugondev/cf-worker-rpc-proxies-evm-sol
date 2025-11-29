import { 
  CORSHandler, 
  createAllowAllCORSConfig, 
  createPermissiveCORSHandler,
  addPermissiveCORSHeaders,
  createPermissivePreflightResponse 
} from './cors';

/**
 * Example 1: Create a CORS handler that allows all origins and headers
 */
export function createDevelopmentCORSHandler(): CORSHandler {
  return createPermissiveCORSHandler();
}

/**
 * Example 2: Handle any request with permissive CORS
 */
export async function handleRequestWithAllowAllCORS(request: Request): Promise<Response> {
  const origin = request.headers.get('Origin');
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return createPermissivePreflightResponse(origin || undefined);
  }
  
  // Handle actual request (example)
  const response = new Response(JSON.stringify({ 
    message: 'Success',
    timestamp: Date.now() 
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
  
  // Add permissive CORS headers
  return addPermissiveCORSHeaders(response, origin || undefined);
}

/**
 * Example 3: Create a custom CORS config that allows everything
 */
export function createCustomAllowAllConfig() {
  const config = createAllowAllCORSConfig();
  
  // You can customize further if needed
  config.credentials = true; // Enable credentials if needed
  config.maxAge = 3600; // Reduce cache time
  
  return new CORSHandler(config);
}

/**
 * Example 4: Middleware function to add CORS to any response
 */
export function withCORS(handler: (request: Request) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('Origin');
    
    // Handle preflight
    if (request.method === 'OPTIONS') {
      return createPermissivePreflightResponse(origin || undefined);
    }
    
    // Execute the actual handler
    const response = await handler(request);
    
    // Add CORS headers to the response
    return addPermissiveCORSHeaders(response, origin || undefined);
  };
}

/**
 * Example 5: Simple function to check if CORS is needed
 */
export function needsCORS(request: Request): boolean {
  const origin = request.headers.get('Origin');
  return origin !== null && origin !== undefined;
}

/**
 * Example usage in a Cloudflare Worker
 */
export const exampleWorkerHandler = withCORS(async (request: Request): Promise<Response> => {
  // Your actual API logic here
  const url = new URL(request.url);
  
  if (url.pathname === '/api/health') {
    return new Response(JSON.stringify({ status: 'ok' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (url.pathname === '/api/data') {
    return new Response(JSON.stringify({ 
      data: 'Some data',
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response('Not Found', { status: 404 });
});