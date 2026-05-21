// schema/index.ts
// Aggregates every table so Drizzle's query builder receives the full schema
// in one shot (`drizzle(client, { schema })`).

export * from './users.js';
export * from './magicLinkTokens.js';
export * from './sessions.js';
export * from './votes.js';
export * from './voteRounds.js';
export * from './voteOptions.js';
export * from './eligibleVoters.js';
export * from './participations.js';
export * from './ballots.js';
export * from './auditLog.js';
export * from './proxies.js';
