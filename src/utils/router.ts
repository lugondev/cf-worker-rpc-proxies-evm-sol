/**
 * High-performance router for Cloudflare Workers
 * Uses pre-compiled patterns and efficient matching
 */

export type RouteHandler = (request: Request, params: Record<string, string>) => Promise<Response> | Response;

export interface Route {
	method: string;
	pattern: string | RegExp;
	handler: RouteHandler;
	compiled?: RegExp;
	paramNames?: string[];
}

export class Router {
	private staticRoutes: Map<string, Map<string, RouteHandler>> = new Map();
	private dynamicRoutes: Route[] = [];

	/**
	 * Add a route to the router
	 */
	add(method: string, pattern: string | RegExp, handler: RouteHandler): void {
		// Check if it's a static route (no parameters)
		if (typeof pattern === 'string' && !pattern.includes(':') && !pattern.includes('*')) {
			if (!this.staticRoutes.has(method)) {
				this.staticRoutes.set(method, new Map());
			}
			this.staticRoutes.get(method)!.set(pattern, handler);
			return;
		}

		// Dynamic route - compile pattern
		const route: Route = {
			method,
			pattern,
			handler
		};

		if (typeof pattern === 'string') {
			const { regex, paramNames } = this.compilePattern(pattern);
			route.compiled = regex;
			route.paramNames = paramNames;
		} else {
			route.compiled = pattern;
			route.paramNames = [];
		}

		this.dynamicRoutes.push(route);
	}

	/**
	 * Compile a string pattern to regex
	 * Supports :param and * wildcards
	 */
	private compilePattern(pattern: string): { regex: RegExp; paramNames: string[] } {
		const paramNames: string[] = [];

		// Escape special regex characters except : and *
		let regexStr = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

		// Replace :param with named capture groups
		regexStr = regexStr.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, paramName) => {
			paramNames.push(paramName);
			return '([^/]+)';
		});

		// Replace * with wildcard
		regexStr = regexStr.replace(/\*/g, '(.*)');

		// Anchor the pattern
		regexStr = `^${regexStr}$`;

		return {
			regex: new RegExp(regexStr),
			paramNames
		};
	}

	/**
	 * Match a request to a route
	 */
	match(request: Request): { handler: RouteHandler; params: Record<string, string> } | null {
		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method;

		// Try static routes first (fastest)
		const staticHandler = this.staticRoutes.get(method)?.get(path);
		if (staticHandler) {
			return { handler: staticHandler, params: {} };
		}

		// Try dynamic routes
		for (const route of this.dynamicRoutes) {
			if (route.method !== method && route.method !== '*') {
				continue;
			}

			if (!route.compiled) {
				continue;
			}

			const match = path.match(route.compiled);
			if (match) {
				const params: Record<string, string> = {};

				if (route.paramNames) {
					for (let i = 0; i < route.paramNames.length; i++) {
						params[route.paramNames[i]] = match[i + 1];
					}
				}

				return { handler: route.handler, params };
			}
		}

		return null;
	}

	/**
	 * Convenience methods for HTTP verbs
	 */
	get(pattern: string | RegExp, handler: RouteHandler): void {
		this.add('GET', pattern, handler);
	}

	post(pattern: string | RegExp, handler: RouteHandler): void {
		this.add('POST', pattern, handler);
	}

	put(pattern: string | RegExp, handler: RouteHandler): void {
		this.add('PUT', pattern, handler);
	}

	delete(pattern: string | RegExp, handler: RouteHandler): void {
		this.add('DELETE', pattern, handler);
	}

	options(pattern: string | RegExp, handler: RouteHandler): void {
		this.add('OPTIONS', pattern, handler);
	}

	/**
	 * Handle any method
	 */
	all(pattern: string | RegExp, handler: RouteHandler): void {
		this.add('*', pattern, handler);
	}
}

/**
 * Route builder for cleaner syntax
 */
export class RouteBuilder {
	private router: Router;

	constructor(router: Router) {
		this.router = router;
	}

	/**
	 * Create route groups with common prefix
	 */
	group(prefix: string, callback: (builder: RouteBuilder) => void): void {
		const groupRouter = new Router();
		const groupBuilder = new RouteBuilder(groupRouter);

		callback(groupBuilder);

		// Copy routes with prefix
		// This is a simplified implementation
		// In production, you'd want to properly merge the routers
	}
}
