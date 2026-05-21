// crypto.ts
// Cryptographic primitives used by the auth flow and the anonymous-ballot
// dissociation scheme. Node's built-in `crypto` module — no third-party deps.

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Generates a cryptographically secure random hex token of the given byte
 * length (default 32 bytes → 64 hex chars). Used for magic links, session
 * tokens, and anonymous ballot tokens.
 */
export const generateToken = (bytes = 32): string => randomBytes(bytes).toString('hex');

/** SHA-256 hex digest of a string — used to store tokens at rest. */
export const sha256Hex = (input: string): string =>
  createHash('sha256').update(input).digest('hex');

/**
 * Constant-time comparison of two hex strings. Use whenever comparing a
 * user-supplied token hash to a stored one to avoid timing side channels.
 */
export const timingSafeEqualHex = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
};
