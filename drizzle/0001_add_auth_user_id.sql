ALTER TABLE "members" ADD COLUMN "auth_user_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "members_auth_user_key" ON "members" USING btree ("auth_user_id");