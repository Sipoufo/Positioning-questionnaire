// rateLimits.ts
// Per-route limiters layered ON TOP of the global /api limiter. Magic-link
// requests and ballot casts deserve stricter caps than CRUD listing.

import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

// In dev, raise the caps so iterating on the UI doesn't lock us out for 15 min.
const isProd = config.NODE_ENV === 'production';
const cap = (prod: number, dev: number): number => (isProd ? prod : dev);

/** 5 magic-link requests per IP per 15 min in prod — blunts email-enumeration spam. */
export const magicLinkRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: cap(5, 1000),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'too_many_requests' },
});

/** 20 verify attempts per IP per 15 min in prod — generous to absorb retries. */
export const magicLinkVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: cap(20, 1000),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'too_many_requests' },
});

/** 5 ballot submissions per IP per minute in prod — prevents accidental double-clicks. */
export const ballotCastLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: cap(5, 1000),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'too_many_requests' },
});
