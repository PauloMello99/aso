DROP TABLE IF EXISTS "customer_update_invitations" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "customer_self_registrations" CASCADE;
--> statement-breakpoint
ALTER TABLE "customers" DROP CONSTRAINT IF EXISTS "customers_id_org_id_uq";
