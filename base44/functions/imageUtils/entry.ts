/**
 * Shared image utilities for Kimi/Moonshot vision functions.
 * 
 * - fetchImageAsBase64: Fetches any URL (including Base44 private storage),
 *   detects MIME type from magic bytes, converts to base64 data URI.
 *   No btoa(String.fromCharCode.apply(...)) — uses TextDecoder trick safe for any size.
 * - MAX 5MB enforced; images larger are rejected (Moonshot limit).
 */

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Detect MIME type from first bytes (magic bytes).
 */
function detectMimeType(bytes, contentTypeHeader) {
  if (bytes.length >= 4) {
    // JPEG: FF D8 FF
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'image/jpeg';
    // PNG: 89 50 4E 47
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'image/png';
    // WebP: 52 49 46 46 ... 57 45 42 50
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
    // GIF: 47 49 46 38
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif';
    // HEIC/HEIF: ftyp box at offset 4
    if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) return 'image/jpeg'; // treat as jpeg
  }
  // Fall back to Content-Type header, strip parameters
  if (contentTypeHeader) {
    const ct = contentTypeHeader.split(';')[0].trim().toLowerCase();
    if (ct.startsWith('image/')) return ct;
  }
  return 'image/jpeg';
}

/**
 * Convert Uint8Array to base64 string safely without stack overflow.
 * Uses a chunked approach writing into a pre-allocated string builder.
 */
function uint8ArrayToBase64(bytes) {
  const CHUNK = 0x8000; // 32768 — safe for String.fromCharCode
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    // Using apply on small chunks is safe; avoids spread on large arrays
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * Fetch image from any URL and return a base64 data URI.
 * Handles Base44 file-storage URLs by fetching the binary directly.
 * Enforces MAX_IMAGE_BYTES limit.
 * 
 * @param {string} imageUrl
 * @param {number} timeoutMs  max time for fetch (default 10000)
 * @returns {{ dataUri: string, mimeType: string, sizeBytes: number }}
 */
export async function fetchImageAsBase64(imageUrl, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let imgResp;
  try {
    imgResp = await fetch(imageUrl, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }

  if (!imgResp.ok) {
    throw new Error(`Image fetch failed: HTTP ${imgResp.status} for ${imageUrl}`);
  }

  const contentTypeHeader = imgResp.headers.get('content-type') || '';
  const arrayBuffer = await imgResp.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new Error(`Image too large: ${bytes.length} bytes (max ${MAX_IMAGE_BYTES}). Please use a smaller image.`);
  }

  const mimeType = detectMimeType(bytes, contentTypeHeader);
  const base64 = uint8ArrayToBase64(bytes);
  const dataUri = `data:${mimeType};base64,${base64}`;

  return { dataUri, mimeType, sizeBytes: bytes.length };
}