CREATE TABLE "org_payment_fees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"fixed_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_payment_fees_org_method_uq" UNIQUE("org_id","payment_method")
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "amount_gross_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "fee_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "reverses_transaction_id" uuid;--> statement-breakpoint
ALTER TABLE "org_payment_fees" ADD CONSTRAINT "org_payment_fees_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_reverses_transaction_id_transactions_id_fk" FOREIGN KEY ("reverses_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transactions_org_transacted_idx" ON "transactions" USING btree ("org_id","transacted_at");--> statement-breakpoint
CREATE INDEX "transactions_org_method_idx" ON "transactions" USING btree ("org_id","payment_method");--> statement-breakpoint
CREATE INDEX "transactions_reverses_idx" ON "transactions" USING btree ("reverses_transaction_id");--> statement-breakpoint
-- RLS — org_payment_fees: membros leem; só owners (ou super_admin) escrevem.
ALTER TABLE public.org_payment_fees ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "org_payment_fees_select" ON public.org_payment_fees
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));--> statement-breakpoint
CREATE POLICY "org_payment_fees_insert" ON public.org_payment_fees
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_owner(org_id));--> statement-breakpoint
CREATE POLICY "org_payment_fees_update" ON public.org_payment_fees
  FOR UPDATE USING (public.is_super_admin() OR public.is_org_owner(org_id));--> statement-breakpoint
CREATE POLICY "org_payment_fees_delete" ON public.org_payment_fees
  FOR DELETE USING (public.is_super_admin() OR public.is_org_owner(org_id));