/**
 * Request deduplication utility
 * Prevents duplicate concurrent requests to the same RPC endpoint
 */

interface PendingRequest {
	promise: Promise<any>;
	timestamp: number;
}

export class RequestDeduplicator {
	private pendingRequests: Map<string, PendingRequest> = new Map();
	private maxAge: number;

	constructor(maxAge: number = 30000) {
		this.maxAge = maxAge; // 30 seconds default
	}

	/**
	 * Get or create a request
	 * If an identical request is already in flight, return that promise
	 */
	async deduplicate<T>(
		key: string,
		requestFn: () => Promise<T>
	): Promise<T> {
		// Check if we have a pending request
		const pending = this.pendingRequests.get(key);

		if (pending) {
			// Check if it's not too old
			if (Date.now() - pending.timestamp < this.maxAge) {
				return pending.promise as Promise<T>;
			} else {
				// Request is too old, remove it
				this.pendingRequests.delete(key);
			}
		}

		// Create new request
		const promise = requestFn()
			.finally(() => {
				// Clean up after request completes
				this.pendingRequests.delete(key);
			});

		this.pendingRequests.set(key, {
			promise,
			timestamp: Date.now()
		});

		return promise;
	}

	/**
	 * Clear all pending requests
	 */
	clear(): void {
		this.pendingRequests.clear();
	}

	/**
	 * Get number of pending requests
	 */
	getPendingCount(): number {
		return this.pendingRequests.size;
	}

	/**
	 * Clean up old pending requests
	 */
	cleanup(): void {
		const now = Date.now();
		for (const [key, pending] of this.pendingRequests.entries()) {
			if (now - pending.timestamp > this.maxAge) {
				this.pendingRequests.delete(key);
			}
		}
	}
}

/**
 * Global deduplicator instance
 */
let globalDeduplicator: RequestDeduplicator | null = null;

export function getRequestDeduplicator(): RequestDeduplicator {
	if (!globalDeduplicator) {
		globalDeduplicator = new RequestDeduplicator();
	}
	return globalDeduplicator;
}
