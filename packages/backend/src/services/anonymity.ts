// anonymity.ts
// Crypto helpers specific to the anonymous-ballot dissociation scheme.
//
//   - `generateBallotToken()` — fresh per-ballot random identifier
//   - `computeReceiptCode()`  — deterministic receipt published post-close
//   - `encryptVoteSecret()` / `decryptVoteSecret()` — AES-256-GCM envelope
//     applied to the per-vote secret stored in `votes.anonymous_key`
//
// The receipt scheme is deliberately simple: BLAKE2b over (token | vote_id |
// canonical-choices). No HMAC secret is needed because the token already
// supplies the entropy that ties the receipt to a specific ballot. The
// receipt is only emailed AFTER the vote closes (avoids live coercion proof).

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { config } from '../config.js';

/** 64 hex chars = 32 bytes. Stored in `ballots.ballot_token` (CHAR(64)). */
export const generateBallotToken = (): string => randomBytes(32).toString('hex');

const RECEIPT_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // base32 minus 0,1,I,O — friendly for humans.

const toBase32 = (buf: Buffer, length: number): string => {
  // Bit-stream reader → emit `length` symbols.
  let bits = 0;
  let value = 0;
  let out = '';
  for (let i = 0; i < buf.length && out.length < length; i++) {
    value = (value << 8) | buf[i]!;
    bits += 8;
    while (bits >= 5 && out.length < length) {
      const idx = (value >>> (bits - 5)) & 0x1f;
      out += RECEIPT_ALPHABET[idx];
      bits -= 5;
    }
  }
  return out;
};

/**
 * Receipt code shown to the voter (in the post-close email) and printed in
 * the results PDF — letting them confirm their ballot was counted as cast
 * without anyone else being able to attribute it to them.
 *
 * 16 chars × 5 bits = 80 bits of entropy — collision probability is
 * negligible at Happy Cash scale (<100 ballots per round).
 */
export const computeReceiptCode = (
  ballotToken: string,
  voteId: string,
  choices: readonly string[],
): string => {
  const canonical = [...choices].sort().join(',');
  const digest = createHash('blake2b512')
    .update(`${ballotToken}|${voteId}|${canonical}`)
    .digest();
  return toBase32(digest, 16);
};

// ─────────────────────────────────────────────────────────────────────────────
// AES-256-GCM envelope for `votes.anonymous_key`
// ─────────────────────────────────────────────────────────────────────────────

export interface EncryptedSecret {
  iv: string;
  ciphertext: string;
  authTag: string;
}

const masterKey = (): Buffer => Buffer.from(config.ANONYMITY_MASTER_KEY, 'hex');

/** Encrypts a per-vote secret with the boot-time master key. */
export const encryptVoteSecret = (plaintext: Buffer): EncryptedSecret => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', masterKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return {
    iv: iv.toString('hex'),
    ciphertext: ct.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex'),
  };
};

/** Decrypts a per-vote secret. Throws if the auth tag mismatches. */
export const decryptVoteSecret = (encrypted: EncryptedSecret): Buffer => {
  const decipher = createDecipheriv(
    'aes-256-gcm',
    masterKey(),
    Buffer.from(encrypted.iv, 'hex'),
  );
  decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, 'hex')),
    decipher.final(),
  ]);
};

/** Fresh 32-byte per-vote secret. */
export const generateVoteSecret = (): Buffer => randomBytes(32);
