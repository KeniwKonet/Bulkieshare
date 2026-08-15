CREATE TYPE "public"."commitment_state" AS ENUM('funded', 'allocated', 'collected', 'refunded', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."dispute_reason" AS ENUM('quality', 'short_weight', 'wrong_cuts', 'no_handover', 'other');--> statement-breakpoint
CREATE TYPE "public"."dispute_state" AS ENUM('open', 'investigating', 'resolved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('member', 'coordinator', 'hub_agent', 'supplier', 'ops', 'admin');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('transfer', 'card', 'credit', 'coordinator', 'manual');--> statement-breakpoint
CREATE TYPE "public"."payment_state" AS ENUM('pending', 'succeeded', 'failed', 'abandoned', 'reversed');--> statement-breakpoint
CREATE TYPE "public"."payout_state" AS ENUM('scheduled', 'processing', 'paid', 'failed');--> statement-breakpoint
CREATE TYPE "public"."po_state" AS ENUM('issued', 'deposit_paid', 'delivered', 'qc_passed', 'qc_failed', 'settled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."pool_category" AS ENUM('meat', 'grains', 'produce', 'other');--> statement-breakpoint
CREATE TYPE "public"."pool_state" AS ENUM('draft', 'open', 'funded', 'allocating', 'distributing', 'completed', 'underfilled', 'refunding', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."quote_state" AS ENUM('open', 'quoted', 'awarded', 'lost', 'expired');--> statement-breakpoint
CREATE TYPE "public"."refund_method" AS ENUM('bank', 'credit');--> statement-breakpoint
CREATE TYPE "public"."refund_state" AS ENUM('requested', 'approved', 'processing', 'paid', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."reservation_state" AS ENUM('holding', 'paid', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."transfer_match_state" AS ENUM('unmatched', 'matched', 'credited', 'returned', 'escalated');--> statement-breakpoint
CREATE TABLE "areas" (
	"slug" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"is_live" boolean DEFAULT false NOT NULL,
	"waitlist_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_label" text DEFAULT 'system' NOT NULL,
	"action" text NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"detail" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beneficiaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commitment_id" uuid NOT NULL,
	"slot_index" integer NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"phone" text,
	"code" text,
	"is_payer" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commitments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_id" text NOT NULL,
	"member_id" uuid NOT NULL,
	"reservation_id" uuid,
	"slots" integer NOT NULL,
	"paid_kobo" integer NOT NULL,
	"state" "commitment_state" DEFAULT 'funded' NOT NULL,
	"paid_by_coordinator" boolean DEFAULT false NOT NULL,
	"collection_code" text,
	"window_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"label" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"amount_kobo" integer NOT NULL,
	"pool_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dispute_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dispute_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"member_id" uuid NOT NULL,
	"commitment_id" uuid,
	"pool_id" text,
	"reason" "dispute_reason" NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"state" "dispute_state" DEFAULT 'open' NOT NULL,
	"resolution" text,
	"resolved_credit_kobo" integer,
	"sla_due_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"area_slug" text NOT NULL,
	"hub_id" text,
	"coordinator_id" uuid NOT NULL,
	"fee_pct_basis_points" integer DEFAULT 300 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "handovers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commitment_id" uuid NOT NULL,
	"hub_id" text NOT NULL,
	"agent_id" uuid,
	"weight_grams" integer,
	"notes" text,
	"handed_over_at" timestamp with time zone DEFAULT now() NOT NULL,
	"synced_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "hubs" (
	"id" text PRIMARY KEY NOT NULL,
	"area_slug" text NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"landmark" text DEFAULT '' NOT NULL,
	"windows" text DEFAULT '' NOT NULL,
	"capacity_per_hour" integer DEFAULT 20 NOT NULL,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"role" "member_role" DEFAULT 'member' NOT NULL,
	"area_slug" text,
	"home_hub_id" text,
	"supplier_id" uuid,
	"credit_kobo" integer DEFAULT 0 NOT NULL,
	"notify_whatsapp" boolean DEFAULT true NOT NULL,
	"notify_sms" boolean DEFAULT true NOT NULL,
	"notify_pool_open" boolean DEFAULT true NOT NULL,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"channel" text DEFAULT 'whatsapp' NOT NULL,
	"template" text NOT NULL,
	"body" text NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"code_hash" text NOT NULL,
	"channel" text DEFAULT 'whatsapp' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"reservation_id" uuid,
	"member_id" uuid,
	"amount_kobo" integer NOT NULL,
	"method" "payment_method" DEFAULT 'transfer' NOT NULL,
	"state" "payment_state" DEFAULT 'pending' NOT NULL,
	"provider" text DEFAULT 'mock' NOT NULL,
	"provider_reference" text,
	"virtual_account_number" text,
	"virtual_account_bank" text,
	"raw_payload" jsonb,
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pool_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_id" text NOT NULL,
	"label" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pool_reports" (
	"pool_id" text PRIMARY KEY NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"collected_kobo" integer DEFAULT 0 NOT NULL,
	"live_weight_grams" integer,
	"usable_weight_grams" integer,
	"nominal_weight_grams" integer,
	"yield_variance_basis_points" integer DEFAULT 0 NOT NULL,
	"handovers" integer DEFAULT 0 NOT NULL,
	"disputes" integer DEFAULT 0 NOT NULL,
	"cost_breakdown" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"margin_kobo" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pools" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"area_slug" text NOT NULL,
	"hub_id" text NOT NULL,
	"supplier_id" uuid,
	"group_id" uuid,
	"title" text NOT NULL,
	"category" "pool_category" DEFAULT 'other' NOT NULL,
	"photo_caption" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"unit_description" text DEFAULT '' NOT NULL,
	"tolerance_band" text,
	"cuts_breakdown" text,
	"total_slots" integer NOT NULL,
	"threshold" integer NOT NULL,
	"price_per_slot_kobo" integer NOT NULL,
	"market_price_per_slot_kobo" integer,
	"state" "pool_state" DEFAULT 'draft' NOT NULL,
	"closes_at" timestamp with time zone NOT NULL,
	"share_date" timestamp with time zone NOT NULL,
	"allocation_seed" text,
	"seed_published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"po" text NOT NULL,
	"supplier_id" uuid NOT NULL,
	"pool_id" text,
	"item" text NOT NULL,
	"value_kobo" integer NOT NULL,
	"deposit_kobo" integer DEFAULT 0 NOT NULL,
	"balance_kobo" integer DEFAULT 0 NOT NULL,
	"state" "po_state" DEFAULT 'issued' NOT NULL,
	"qc_note" text,
	"delivered_at" timestamp with time zone,
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"area_slug" text,
	"hub_id" text,
	"last_price_kobo" integer,
	"deposit_pct" integer DEFAULT 40 NOT NULL,
	"min_hold_days" integer DEFAULT 7 NOT NULL,
	"state" "quote_state" DEFAULT 'open' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_request_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"price_kobo" integer NOT NULL,
	"hold_days" integer DEFAULT 7 NOT NULL,
	"note" text,
	"is_awarded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"member_id" uuid NOT NULL,
	"commitment_id" uuid,
	"pool_id" text,
	"amount_kobo" integer NOT NULL,
	"method" "refund_method" DEFAULT 'bank' NOT NULL,
	"state" "refund_state" DEFAULT 'requested' NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"bank_name" text,
	"bank_account_number" text,
	"due_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"pool_id" text NOT NULL,
	"member_id" uuid NOT NULL,
	"slots" integer NOT NULL,
	"subtotal_kobo" integer NOT NULL,
	"credit_applied_kobo" integer DEFAULT 0 NOT NULL,
	"amount_due_kobo" integer NOT NULL,
	"state" "reservation_state" DEFAULT 'holding' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"user_agent" text,
	"revoked_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"purchase_order_id" uuid,
	"amount_kobo" integer NOT NULL,
	"state" "payout_state" DEFAULT 'scheduled' NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"contact_phone" text,
	"contact_name" text,
	"bank_name" text,
	"bank_account_number" text,
	"bank_account_name" text,
	"orders_delivered" integer DEFAULT 0 NOT NULL,
	"yield_accuracy_pct" integer DEFAULT 0 NOT NULL,
	"on_time_pct" integer DEFAULT 0 NOT NULL,
	"reject_rate_pct" integer DEFAULT 0 NOT NULL,
	"is_approved" boolean DEFAULT false NOT NULL,
	"whatsapp_opt_in" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unmatched_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"amount_kobo" integer NOT NULL,
	"from_name" text DEFAULT '' NOT NULL,
	"bank_ref" text DEFAULT '' NOT NULL,
	"narration" text DEFAULT '' NOT NULL,
	"guess" text DEFAULT '' NOT NULL,
	"state" "transfer_match_state" DEFAULT 'unmatched' NOT NULL,
	"matched_reservation_id" uuid,
	"resolved_by" uuid,
	"received_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"area_slug" text NOT NULL,
	"neighbourhood" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_members_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_commitment_id_commitments_id_fk" FOREIGN KEY ("commitment_id") REFERENCES "public"."commitments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commitments" ADD CONSTRAINT "commitments_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commitments" ADD CONSTRAINT "commitments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commitments" ADD CONSTRAINT "commitments_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_movements" ADD CONSTRAINT "credit_movements_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_movements" ADD CONSTRAINT "credit_movements_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispute_photos" ADD CONSTRAINT "dispute_photos_dispute_id_disputes_id_fk" FOREIGN KEY ("dispute_id") REFERENCES "public"."disputes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_commitment_id_commitments_id_fk" FOREIGN KEY ("commitment_id") REFERENCES "public"."commitments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_area_slug_areas_slug_fk" FOREIGN KEY ("area_slug") REFERENCES "public"."areas"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_hub_id_hubs_id_fk" FOREIGN KEY ("hub_id") REFERENCES "public"."hubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_coordinator_id_members_id_fk" FOREIGN KEY ("coordinator_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_commitment_id_commitments_id_fk" FOREIGN KEY ("commitment_id") REFERENCES "public"."commitments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_hub_id_hubs_id_fk" FOREIGN KEY ("hub_id") REFERENCES "public"."hubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_agent_id_members_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hubs" ADD CONSTRAINT "hubs_area_slug_areas_slug_fk" FOREIGN KEY ("area_slug") REFERENCES "public"."areas"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_area_slug_areas_slug_fk" FOREIGN KEY ("area_slug") REFERENCES "public"."areas"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_home_hub_id_hubs_id_fk" FOREIGN KEY ("home_hub_id") REFERENCES "public"."hubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_events" ADD CONSTRAINT "pool_events_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_reports" ADD CONSTRAINT "pool_reports_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pools" ADD CONSTRAINT "pools_area_slug_areas_slug_fk" FOREIGN KEY ("area_slug") REFERENCES "public"."areas"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pools" ADD CONSTRAINT "pools_hub_id_hubs_id_fk" FOREIGN KEY ("hub_id") REFERENCES "public"."hubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pools" ADD CONSTRAINT "pools_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pools" ADD CONSTRAINT "pools_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_area_slug_areas_slug_fk" FOREIGN KEY ("area_slug") REFERENCES "public"."areas"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_hub_id_hubs_id_fk" FOREIGN KEY ("hub_id") REFERENCES "public"."hubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_quote_request_id_quote_requests_id_fk" FOREIGN KEY ("quote_request_id") REFERENCES "public"."quote_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_commitment_id_commitments_id_fk" FOREIGN KEY ("commitment_id") REFERENCES "public"."commitments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payouts" ADD CONSTRAINT "supplier_payouts_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payouts" ADD CONSTRAINT "supplier_payouts_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unmatched_transfers" ADD CONSTRAINT "unmatched_transfers_matched_reservation_id_reservations_id_fk" FOREIGN KEY ("matched_reservation_id") REFERENCES "public"."reservations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unmatched_transfers" ADD CONSTRAINT "unmatched_transfers_resolved_by_members_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_at_idx" ON "audit_events" USING btree ("at");--> statement-breakpoint
CREATE UNIQUE INDEX "beneficiaries_slot_key" ON "beneficiaries" USING btree ("commitment_id","slot_index");--> statement-breakpoint
CREATE INDEX "commitments_pool_idx" ON "commitments" USING btree ("pool_id");--> statement-breakpoint
CREATE INDEX "commitments_member_idx" ON "commitments" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "credit_movements_member_idx" ON "credit_movements" USING btree ("member_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "disputes_reference_key" ON "disputes" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "disputes_state_idx" ON "disputes" USING btree ("state","sla_due_at");--> statement-breakpoint
CREATE UNIQUE INDEX "group_members_key" ON "group_members" USING btree ("group_id","member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "groups_slug_key" ON "groups" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "handovers_hub_idx" ON "handovers" USING btree ("hub_id","handed_over_at");--> statement-breakpoint
CREATE INDEX "hubs_area_idx" ON "hubs" USING btree ("area_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "members_phone_key" ON "members" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "notifications_member_idx" ON "notifications" USING btree ("member_id","created_at");--> statement-breakpoint
CREATE INDEX "otp_phone_idx" ON "otp_challenges" USING btree ("phone","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_reference_key" ON "payments" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "payments_reservation_idx" ON "payments" USING btree ("reservation_id");--> statement-breakpoint
CREATE INDEX "pool_events_pool_idx" ON "pool_events" USING btree ("pool_id","at");--> statement-breakpoint
CREATE INDEX "pools_area_state_idx" ON "pools" USING btree ("area_slug","state");--> statement-breakpoint
CREATE INDEX "pools_hub_idx" ON "pools" USING btree ("hub_id");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_orders_po_key" ON "purchase_orders" USING btree ("po");--> statement-breakpoint
CREATE INDEX "purchase_orders_supplier_idx" ON "purchase_orders" USING btree ("supplier_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quotes_request_supplier_key" ON "quotes" USING btree ("quote_request_id","supplier_id");--> statement-breakpoint
CREATE UNIQUE INDEX "refunds_reference_key" ON "refunds" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "refunds_member_idx" ON "refunds" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reservations_reference_key" ON "reservations" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "reservations_pool_state_idx" ON "reservations" USING btree ("pool_id","state");--> statement-breakpoint
CREATE INDEX "reservations_member_idx" ON "reservations" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "sessions_member_idx" ON "sessions" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_phone_area_key" ON "waitlist" USING btree ("phone","area_slug");