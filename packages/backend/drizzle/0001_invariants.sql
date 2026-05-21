-- 0001_invariants.sql
-- Hand-written CHECK constraints that complement the Drizzle-generated schema.
-- These guard invariants the application relies on; keeping them at the DB
-- layer prevents a buggy code path from silently writing inconsistent rows.

-- A member level is exactly 1, 2 or 3 (mirrors Q2.1 of the HC_05 questionnaire).
ALTER TABLE "users"
  ADD CONSTRAINT "users_level_range_check"
  CHECK ("level" IN (1, 2, 3));
--> statement-breakpoint

-- A ballot is EITHER anonymous (ballot_token set, user_id null)
-- OR open (user_id set, ballot_token null). Never both, never neither.
ALTER TABLE "ballots"
  ADD CONSTRAINT "ballots_mode_exclusivity_check"
  CHECK (
    ("ballot_token" IS NOT NULL AND "user_id" IS NULL)
    OR ("ballot_token" IS NULL AND "user_id" IS NOT NULL)
  );
--> statement-breakpoint

-- A blank ballot has no choices; a non-blank ballot has at least one.
ALTER TABLE "ballots"
  ADD CONSTRAINT "ballots_choices_blank_consistency_check"
  CHECK (
    ("is_blank" = true AND cardinality("choices") = 0)
    OR ("is_blank" = false AND cardinality("choices") >= 1)
  );
--> statement-breakpoint

-- Quorum is expressed as a percentage in [0, 100].
ALTER TABLE "votes"
  ADD CONSTRAINT "votes_quorum_range_check"
  CHECK ("quorum_pct" >= 0 AND "quorum_pct" <= 100);
--> statement-breakpoint

-- top_n_for_round2 must be at least 2 (a 1-option runoff is meaningless).
ALTER TABLE "votes"
  ADD CONSTRAINT "votes_top_n_min_check"
  CHECK ("top_n_for_round2" >= 2);
