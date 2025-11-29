/**
 * Response compression utilities for cache optimization
 * Cloudflare Workers support CompressionStream API
 */

/**
 * Compress data using gzip
 */
export async function compress(data: string): Promise<ArrayBuffer> {
	const encoder = new TextEncoder();
	const input = encoder.encode(data);

	const compressionStream = new CompressionStream('gzip');
	const writer = compressionStream.writable.getWriter();
	writer.write(input);
	writer.close();

	const chunks: Uint8Array[] = [];
	const reader = compressionStream.readable.getReader();

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
	}

	// Combine chunks into single ArrayBuffer
	const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
	const result = new Uint8Array(totalLength);
	let offset = 0;

	for (const chunk of chunks) {
		result.set(chunk, offset);
		offset += chunk.length;
	}

	return result.buffer;
}

/**
 * Decompress gzip data
 */
export async function decompress(data: ArrayBuffer): Promise<string> {
	const decompressionStream = new DecompressionStream('gzip');
	const writer = decompressionStream.writable.getWriter();
	writer.write(new Uint8Array(data));
	writer.close();

	const chunks: Uint8Array[] = [];
	const reader = decompressionStream.readable.getReader();

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
	}

	// Combine chunks
	const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
	const result = new Uint8Array(totalLength);
	let offset = 0;

	for (const chunk of chunks) {
		result.set(chunk, offset);
		offset += chunk.length;
	}

	const decoder = new TextDecoder();
	return decoder.decode(result);
}

/**
 * Check if data should be compressed
 * Only compress if data is large enough to benefit
 */
export function shouldCompress(data: string, minSize: number = 1024): boolean {
	// Don't compress small responses (overhead not worth it)
	return data.length >= minSize;
}

/**
 * Compress data for cache storage
 * Returns base64 encoded compressed data
 */
export async function compressForCache(data: string): Promise<string> {
	if (!shouldCompress(data)) {
		return data;
	}

	const compressed = await compress(data);
	const uint8Array = new Uint8Array(compressed);

	// Convert to base64
	let binary = '';
	for (let i = 0; i < uint8Array.length; i++) {
		binary += String.fromCharCode(uint8Array[i]);
	}

	return btoa(binary);
}

/**
 * Decompress data from cache
 * Handles both compressed and uncompressed data
 */
export async function decompressFromCache(data: string): Promise<string> {
	// Try to detect if data is compressed (base64 encoded)
	// Simple heuristic: if it starts with valid JSON characters, it's not compressed
	if (data.startsWith('{') || data.startsWith('[')) {
		return data;
	}

	try {
		// Decode base64
		const binary = atob(data);
		const bytes = new Uint8Array(binary.length);

		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i);
		}

		return await decompress(bytes.buffer);
	} catch (error) {
		// If decompression fails, return original data
		return data;
	}
}

/**
 * Calculate compression ratio
 */
export function getCompressionRatio(original: string, compressed: ArrayBuffer): number {
	const originalSize = new TextEncoder().encode(original).length;
	const compressedSize = compressed.byteLength;

	return compressedSize / originalSize;
}

/**
 * Estimate compressed size without actually compressing
 * Useful for deciding whether to compress
 */
export function estimateCompressedSize(data: string): number {
	// Very rough estimate: JSON typically compresses to 20-30% of original
	// This is just a heuristic
	const originalSize = new TextEncoder().encode(data).length;

	// Check for repetitive patterns (better compression)
	const uniqueChars = new Set(data).size;
	const repetitionFactor = uniqueChars / data.length;

	// More repetition = better compression
	const estimatedRatio = 0.2 + (repetitionFactor * 0.3);

	return Math.floor(originalSize * estimatedRatio);
}
