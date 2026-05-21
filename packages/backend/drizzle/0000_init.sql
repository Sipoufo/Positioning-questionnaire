CREATE TYPE "public"."user_role" AS ENUM('member', 'admin');--> statement-breakpoint
CREATE TYPE "public"."close_mode" AS ENUM('auto', 'manual');--> statement-breakpoint
CREATE TYPE "public"."majority_base" AS ENUM('expressed', 'expressed_with_blank', 'eligible');--> statement-breakpoint
CREATE TYPE "public"."majority_type" AS ENUM('simple', 'absolute', 'qualified_2_3', 'qualified_3_4', 'unanimous');--> statement-breakpoint
CREATE TYPE "public"."result_visibility" AS ENUM('immediate', 'on_close', 'admin_only');--> statement-breakpoint
CREATE TYPE "public"."scrutin_type" AS ENUM('single', 'multiple');--> statement-breakpoint
CREATE TYPE "public"."vote_mode" AS ENUM('anonymous', 'open');--> statement-breakpoint
CREATE TYPE "public"."vote_status" AS ENUM('draft', 'open', 'closed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."round_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(254) NOT NULL,
	"full_name" varchar(200) NOT NULL,
	"level" smallint NOT NULL,
	"role" "user_role" DEFAULT 'member' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "magic_link_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" char(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "magic_link_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" char(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"mode" "vote_mode" NOT NULL,
	"scrutin_type" "scrutin_type" NOT NULL,
	"max_choices" smallint DEFAULT 1 NOT NULL,
	"allow_blank" boolean DEFAULT false NOT NULL,
	"eligible_levels" smallint[] NOT NULL,
	"quorum_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"majority_type" "majority_type" NOT NULL,
	"majority_base" "majority_base" DEFAULT 'expressed' NOT NULL,
	"result_visibility" "result_visibility" NOT NULL,
	"open_at" timestamp with time zone,
	"close_at" timestamp with time zone,
	"close_mode" "close_mode" DEFAULT 'manual' NOT NULL,
	"status" "vote_status" DEFAULT 'draft' NOT NULL,
	"multi_round" boolean DEFAULT false NOT NULL,
	"top_n_for_round2" smallint DEFAULT 2 NOT NULL,
	"anonymous_key" jsonb,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vote_rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vote_id" uuid NOT NULL,
	"round_number" smallint DEFAULT 1 NOT NULL,
	"status" "round_status" DEFAULT 'open' NOT NULL,
	"open_at" timestamp with time zone DEFAULT now() NOT NULL,
	"close_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vote_rounds_vote_id_round_number_unique" UNIQUE("vote_id","round_number")
);
--> statement-breakpoint
CREATE TABLE "vote_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vote_id" uuid NOT NULL,
	"round_id" uuid NOT NULL,
	"label_fr" varchar(300) NOT NULL,
	"label_en" varchar(300) NOT NULL,
	"display_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eligible_voters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vote_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "eligible_voters_vote_user_unique" UNIQUE("vote_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "participations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"round_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"voted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "participations_round_user_unique" UNIQUE("round_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "ballots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"round_id" uuid NOT NULL,
	"ballot_token" char(64),
	"user_id" uuid,
	"choices" uuid[] NOT NULL,
	"is_blank" boolean DEFAULT false NOT NULL,
	"comment" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ballots_ballot_token_unique" UNIQUE("ballot_token")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"actor_id" uuid,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proxies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vote_id" uuid NOT NULL,
	"delegator_id" uuid NOT NULL,
	"delegate_id" uuid NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proxies_vote_delegator_unique" UNIQUE("vote_id","delegator_id"),
	CONSTRAINT "proxies_no_self_delegation" CHECK ("proxies"."delegator_id" <> "proxies"."delegate_id")
);
--> statement-breakpoint
ALTER TABLE "magic_link_tokens" ADD CONSTRAINT "magic_link_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_rounds" ADD CONSTRAINT "vote_rounds_vote_id_votes_id_fk" FOREIGN KEY ("vote_id") REFERENCES "public"."votes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_options" ADD CONSTRAINT "vote_options_vote_id_votes_id_fk" FOREIGN KEY ("vote_id") REFERENCES "public"."votes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_options" ADD CONSTRAINT "vote_options_round_id_vote_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."vote_rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligible_voters" ADD CONSTRAINT "eligible_voters_vote_id_votes_id_fk" FOREIGN KEY ("vote_id") REFERENCES "public"."votes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligible_voters" ADD CONSTRAINT "eligible_voters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participations" ADD CONSTRAINT "participations_round_id_vote_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."vote_rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participations" ADD CONSTRAINT "participations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ballots" ADD CONSTRAINT "ballots_round_id_vote_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."vote_rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ballots" ADD CONSTRAINT "ballots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proxies" ADD CONSTRAINT "proxies_vote_id_votes_id_fk" FOREIGN KEY ("vote_id") REFERENCES "public"."votes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proxies" ADD CONSTRAINT "proxies_delegator_id_users_id_fk" FOREIGN KEY ("delegator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proxies" ADD CONSTRAINT "proxies_delegate_id_users_id_fk" FOREIGN KEY ("delegate_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");