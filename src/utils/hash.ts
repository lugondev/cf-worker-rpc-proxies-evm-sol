/**
 * Fast hashing utilities for cache keys and consistent hashing
 */

/**
 * FNV-1a hash algorithm - fast and good distribution for strings
 * Perfect for cache key generation
 */
export function fnv1aHash(str: string): string {
	let hash = 2166136261; // FNV offset basis

	for (let i = 0; i < str.length; i++) {
		hash ^= str.charCodeAt(i);
		hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
	}

	// Convert to unsigned 32-bit integer and return as hex string
	return (hash >>> 0).toString(16);
}

/**
 * Generate cache key from components using fast hashing
 * Much faster than JSON.stringify for complex objects
 */
export function generateCacheKey(chainId: string | number, method: string, params: any[]): string {
	// For simple cases (no params or empty params), use direct concatenation
	if (!params || params.length === 0) {
		return `${chainId}:${method}`;
	}

	// For complex params, create a stable string representation
	const paramsStr = params.map(p => {
		if (p === null || p === undefined) return 'null';
		if (typeof p === 'object') return JSON.stringify(p);
		return String(p);
	}).join('|');

	// Hash the params to keep key size manageable
	const paramsHash = fnv1aHash(paramsStr);

	return `${chainId}:${method}:${paramsHash}`;
}

/**
 * Simple hash for strings - even faster than FNV-1a for short strings
 */
export function simpleHash(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return hash >>> 0; // Ensure unsigned
}

/**
 * Consistent hashing for RPC endpoint selection
 * Ensures same requests go to same endpoints for cache locality
 */
export class ConsistentHash {
	private ring: Map<number, string> = new Map();
	private sortedKeys: number[] = [];
	private virtualNodes: number;

	constructor(virtualNodes: number = 150) {
		this.virtualNodes = virtualNodes;
	}

	/**
	 * Add a node to the hash ring
	 */
	addNode(nodeId: string): void {
		for (let i = 0; i < this.virtualNodes; i++) {
			const virtualKey = `${nodeId}:${i}`;
			const hash = simpleHash(virtualKey);
			this.ring.set(hash, nodeId);
		}
		this.sortedKeys = Array.from(this.ring.keys()).sort((a, b) => a - b);
	}

	/**
	 * Remove a node from the hash ring
	 */
	removeNode(nodeId: string): void {
		for (let i = 0; i < this.virtualNodes; i++) {
			const virtualKey = `${nodeId}:${i}`;
			const hash = simpleHash(virtualKey);
			this.ring.delete(hash);
		}
		this.sortedKeys = Array.from(this.ring.keys()).sort((a, b) => a - b);
	}

	/**
	 * Get the node for a given key
	 */
	getNode(key: string): string | null {
		if (this.sortedKeys.length === 0) {
			return null;
		}

		const hash = simpleHash(key);

		// Binary search for the first key >= hash
		let left = 0;
		let right = this.sortedKeys.length - 1;

		while (left < right) {
			const mid = Math.floor((left + right) / 2);
			if (this.sortedKeys[mid] < hash) {
				left = mid + 1;
			} else {
				right = mid;
			}
		}

		// Wrap around if necessary
		const nodeHash = this.sortedKeys[left] >= hash ? this.sortedKeys[left] : this.sortedKeys[0];
		return this.ring.get(nodeHash) || null;
	}

	/**
	 * Clear all nodes
	 */
	clear(): void {
		this.ring.clear();
		this.sortedKeys = [];
	}
}
