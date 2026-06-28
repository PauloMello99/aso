CREATE TABLE "transaction_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transaction_categories_org_id_name_unique" UNIQUE("org_id","name")
);
--> statement-breakpoint
CREATE TABLE "customer_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_verification_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"verification_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"system_quantity" numeric(10, 2) NOT NULL,
	"physical_quantity" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"performed_by" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "org_memberships" ADD COLUMN "enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "stock_check_interval_days" integer;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "last_used_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "transaction_categories" ADD CONSTRAINT "transaction_categories_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_attachments" ADD CONSTRAINT "customer_attachments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_attachments" ADD CONSTRAINT "customer_attachments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_verification_items" ADD CONSTRAINT "stock_verification_items_verification_id_stock_verifications_id_fk" FOREIGN KEY ("verification_id") REFERENCES "public"."stock_verifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_verification_items" ADD CONSTRAINT "stock_verification_items_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_verifications" ADD CONSTRAINT "stock_verifications_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_transaction_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."transaction_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- ============================================================
-- RLS — tabelas novas (membros leem; escrita conforme o caso)
-- ============================================================
ALTER TABLE public.transaction_categories ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "transaction_categories_select" ON public.transaction_categories
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));--> statement-breakpoint
CREATE POLICY "transaction_categories_insert" ON public.transaction_categories
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_owner(org_id));--> statement-breakpoint
CREATE POLICY "transaction_categories_update" ON public.transaction_categories
  FOR UPDATE USING (public.is_super_admin() OR public.is_org_owner(org_id));--> statement-breakpoint
CREATE POLICY "transaction_categories_delete" ON public.transaction_categories
  FOR DELETE USING (public.is_super_admin() OR public.is_org_owner(org_id));--> statement-breakpoint

ALTER TABLE public.customer_attachments ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "customer_attachments_select" ON public.customer_attachments
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));--> statement-breakpoint
CREATE POLICY "customer_attachments_insert" ON public.customer_attachments
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_member(org_id));--> statement-breakpoint
CREATE POLICY "customer_attachments_delete" ON public.customer_attachments
  FOR DELETE USING (public.is_super_admin() OR public.is_org_member(org_id));--> statement-breakpoint

ALTER TABLE public.stock_verifications ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "stock_verifications_select" ON public.stock_verifications
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));--> statement-breakpoint
CREATE POLICY "stock_verifications_insert" ON public.stock_verifications
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_member(org_id));--> statement-breakpoint

ALTER TABLE public.stock_verification_items ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "stock_verification_items_select" ON public.stock_verification_items
  FOR SELECT USING (public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.stock_verifications sv
    WHERE sv.id = verification_id AND public.is_org_member(sv.org_id)
  ));--> statement-breakpoint
CREATE POLICY "stock_verification_items_insert" ON public.stock_verification_items
  FOR INSERT WITH CHECK (public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.stock_verifications sv
    WHERE sv.id = verification_id AND public.is_org_member(sv.org_id)
  ));--> statement-breakpoint

-- ============================================================
-- SEED — origens de cliente + categorias de transação para orgs existentes
-- ============================================================
INSERT INTO public.customer_origins (org_id, name)
SELECT o.id, v.name
FROM public.organizations o
CROSS JOIN (VALUES
  ('Indicação'),
  ('Rede social do profissional'),
  ('Rede social do estúdio')
) AS v(name)
ON CONFLICT (org_id, name) DO NOTHING;--> statement-breakpoint
INSERT INTO public.transaction_categories (org_id, name)
SELECT o.id, v.name
FROM public.organizations o
CROSS JOIN (VALUES
  ('Serviço'),
  ('Funcionário'),
  ('Material'),
  ('Conta'),
  ('Reforma'),
  ('Transferência'),
  ('Outros')
) AS v(name)
ON CONFLICT (org_id, name) DO NOTHING;