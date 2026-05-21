// voteApi.ts
// Typed fetch wrappers for the /api/auth/* and /api/votes/* endpoints. Reuses
// the same BASE convention as `services/api.ts`. Accepts an optional bearer
// token (the caller pulls it from AuthContext) so this module stays
// React-free and testable.

import type {
  ApiResult,
  BallotPayload,
  CreateVotePayload,
  CreateVoterPayload,
  MagicLinkRequestPayload,
  MagicLinkVerifyPayload,
  MagicLinkVerifyResult,
  PublicUser,
  RoundResult,
  UpdateVoterPayload,
  VoteDetail,
  VoteSummary,
} from '@hc/shared';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface FetchOptions {
  token?: string | null;
  body?: unknown;
}

const apiFetch = async <T>(
  method: Method,
  path: string,
  { token, body }: FetchOptions = {},
): Promise<ApiResult<T>> => {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const parsed: unknown = await res.json().catch(() => ({}));

    if (res.ok) {
      return { ok: true, data: parsed as T };
    }
    const err = parsed as { message?: string; fieldErrors?: Record<string, string> };
    return {
      ok: false,
      status: res.status,
      message: err.message ?? 'request_failed',
      fieldErrors: err.fieldErrors,
    };
  } catch {
    return { ok: false, status: 0, message: 'network_error' };
  }
};

// ─── Auth ────────────────────────────────────────────────────────────────────

export const requestMagicLink = (payload: MagicLinkRequestPayload) =>
  apiFetch<{ ok: true }>('POST', '/auth/request', { body: payload });

export const verifyMagicLink = (payload: MagicLinkVerifyPayload) =>
  apiFetch<MagicLinkVerifyResult>('POST', '/auth/verify', { body: payload });

export const logout = (token: string) =>
  apiFetch<{ ok: true }>('POST', '/auth/logout', { token });

// ─── Votes (member) ──────────────────────────────────────────────────────────

export const listVotes = (token: string) =>
  apiFetch<{ votes: VoteSummary[] }>('GET', '/votes', { token });

export const getVote = (token: string, id: string) =>
  apiFetch<{ vote: VoteDetail }>('GET', `/votes/${id}`, { token });

export const getMyParticipation = (token: string, id: string) =>
  apiFetch<{ participated: boolean; votedAt: string | null }>(
    'GET',
    `/votes/${id}/my-participation`,
    { token },
  );

export const castBallot = (
  token: string,
  voteId: string,
  roundId: string,
  payload: BallotPayload,
) =>
  apiFetch<{ ok: true; receiptCode: string }>(
    'POST',
    `/votes/${voteId}/rounds/${roundId}/ballot`,
    { token, body: payload },
  );

export interface MemberResultRound {
  roundId: string;
  roundNumber: number;
  status: 'open' | 'closed';
  closedAt: string | null;
  result: RoundResult | null;
  options: { id: string; labelFr: string; labelEn: string; displayOrder: number }[];
}

export const getResults = (token: string, id: string) =>
  apiFetch<{
    vote: { id: string; title: string; status: string; mode: string };
    rounds: MemberResultRound[];
  }>('GET', `/votes/${id}/results`, { token });

// ─── Admin: voters ───────────────────────────────────────────────────────────

export const adminListVoters = (token: string) =>
  apiFetch<{ voters: PublicUser[] }>('GET', '/admin/voters', { token });

export const adminCreateVoter = (token: string, payload: CreateVoterPayload) =>
  apiFetch<{ voter: PublicUser }>('POST', '/admin/voters', { token, body: payload });

export const adminUpdateVoter = (token: string, id: string, payload: UpdateVoterPayload) =>
  apiFetch<{ voter: PublicUser }>('PATCH', `/admin/voters/${id}`, { token, body: payload });

export const adminDeactivateVoter = (token: string, id: string) =>
  apiFetch<{ ok: true }>('DELETE', `/admin/voters/${id}`, { token });

// ─── Admin: votes ────────────────────────────────────────────────────────────

export interface AdminVoteRow {
  id: string;
  title: string;
  status: 'draft' | 'open' | 'closed' | 'cancelled';
  mode: 'anonymous' | 'open';
  closeAt: string | null;
  createdAt: string;
}

export const adminListVotes = (token: string) =>
  apiFetch<{ votes: AdminVoteRow[] }>('GET', '/admin/votes', { token });

export const adminCreateVote = (token: string, payload: CreateVotePayload) =>
  apiFetch<{ vote: AdminVoteRow }>('POST', '/admin/votes', { token, body: payload });

export const adminGetVote = (token: string, id: string) =>
  apiFetch<{ vote: AdminVoteRow; rounds: unknown[] }>('GET', `/admin/votes/${id}`, { token });

export const adminOpenVote = (token: string, id: string) =>
  apiFetch<{ voteId: string; roundId: string }>('POST', `/admin/votes/${id}/open`, { token });

export const adminCloseVote = (token: string, id: string) =>
  apiFetch<{
    voteId: string;
    closedRoundId: string;
    nextRoundId: string | null;
    result: RoundResult;
    voteClosed: boolean;
  }>('POST', `/admin/votes/${id}/close`, { token });

export const adminCancelVote = (token: string, id: string) =>
  apiFetch<{ ok: true }>('DELETE', `/admin/votes/${id}`, { token });

export interface ParticipationRow {
  userId: string;
  email: string;
  fullName: string;
  hasVoted: boolean;
  votedAt: string | null;
}

export const adminGetParticipation = (token: string, id: string) =>
  apiFetch<{
    roundId: string;
    roundNumber: number;
    totalEligible: number;
    totalVoted: number;
    voters: ParticipationRow[];
  }>('GET', `/admin/votes/${id}/participation`, { token });

export const adminRemind = (token: string, voteId: string, userId: string) =>
  apiFetch<{ ok: true }>('POST', `/admin/votes/${voteId}/remind/${userId}`, { token });

export interface AdminResultRound {
  roundId: string;
  roundNumber: number;
  status: 'open' | 'closed';
  closedAt: string | null;
  result: RoundResult | null;
  optionLabels: { id: string; labelFr: string; labelEn: string }[];
}

export const adminGetResults = (token: string, id: string) =>
  apiFetch<{ rounds: AdminResultRound[] }>('GET', `/admin/votes/${id}/results`, { token });

// ─── Admin: audit log ────────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string | null;
  actorEmail: string | null;
  actorName: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export const adminGetAuditLog = (
  token: string,
  opts: { limit?: number; before?: string } = {},
) => {
  const params = new URLSearchParams();
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.before) params.set('before', opts.before);
  const qs = params.toString();
  return apiFetch<{ entries: AuditEntry[] }>(
    'GET',
    `/admin/audit-log${qs ? `?${qs}` : ''}`,
    { token },
  );
};
