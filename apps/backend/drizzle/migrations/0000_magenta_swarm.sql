CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'delete', 'invite_sent', 'invite_accepted', 'subscription_changed');
CREATE TYPE "public"."billing_interval" AS ENUM('monthly', 'semiannual', 'annual');
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other');
CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'expired', 'cancelled');
CREATE TYPE "public"."org_role" AS ENUM('owner', 'employee');
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'bank_transfer', 'credit_card', 'debit_card', 'credits');
CREATE TYPE "public"."platform_role" AS ENUM('super_admin', 'user');
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'trialing', 'past_due', 'canceled');
CREATE TYPE "public"."subscription_type" AS ENUM('free', 'trial', 'standard', 'custom');
CREATE TYPE "public"."transaction_type" AS ENUM('income', 'outcome');
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_id" uuid NOT NULL,
	"platform_role" "platform_role" DEFAULT 'user' NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"avatar_url" text,
	"birth_date" date,
	"gender" "gender",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_auth_id_unique" UNIQUE("auth_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE "org_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"invited_by" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "org_role" DEFAULT 'employee' NOT NULL,
	"token" text DEFAULT encode(gen_random_bytes(32), 'hex') NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone DEFAULT now() + interval '7 days' NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_invitations_token_unique" UNIQUE("token"),
	CONSTRAINT "org_invitations_org_id_email_unique" UNIQUE("org_id","email")
);

CREATE TABLE "org_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "org_role" DEFAULT 'employee' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_memberships_org_id_user_id_unique" UNIQUE("org_id","user_id")
);

CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);

CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"type" "subscription_type" DEFAULT 'trial' NOT NULL,
	"status" "subscription_status" DEFAULT 'trialing' NOT NULL,
	"billing_interval" "billing_interval",
	"price_cents" integer,
	"trial_ends_at" timestamp with time zone,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"grace_period_days" integer DEFAULT 14 NOT NULL,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_org_id_unique" UNIQUE("org_id"),
	CONSTRAINT "subscriptions_stripe_customer_id_unique" UNIQUE("stripe_customer_id"),
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);

CREATE TABLE "customer_origins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_origins_org_id_name_unique" UNIQUE("org_id","name")
);

CREATE TABLE "material_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "material_categories_org_id_name_unique" UNIQUE("org_id","name")
);

CREATE TABLE "service_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_types_org_id_name_unique" UNIQUE("org_id","name")
);

CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid,
	"origin_id" uuid,
	"created_by" uuid,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"birth_date" date,
	"gender" "gender",
	"address" text,
	"notes" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"category_id" uuid,
	"name" text NOT NULL,
	"stock_quantity" numeric(10, 2) DEFAULT '0' NOT NULL,
	"unit" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"created_by" uuid,
	"description" text NOT NULL,
	"type" "transaction_type" NOT NULL,
	"amount_cents" integer NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"transacted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "service_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"quantity" numeric(10, 2) DEFAULT '1' NOT NULL,
	CONSTRAINT "service_materials_service_id_material_id_unique" UNIQUE("service_id","material_id")
);

CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"service_type_id" uuid,
	"customer_id" uuid,
	"payment_transaction_id" uuid,
	"performed_by" uuid,
	"created_by" uuid,
	"body_part" text,
	"description" text,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"performed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"assigned_to" uuid,
	"customer_id" uuid,
	"created_by" uuid,
	"title" text NOT NULL,
	"description" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"all_day" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"actor_id" uuid,
	"action" "audit_action" NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "org_invitations" ADD CONSTRAINT "org_invitations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "customer_origins" ADD CONSTRAINT "customer_origins_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "material_categories" ADD CONSTRAINT "material_categories_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "service_types" ADD CONSTRAINT "service_types_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "customers" ADD CONSTRAINT "customers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "customers" ADD CONSTRAINT "customers_origin_id_customer_origins_id_fk" FOREIGN KEY ("origin_id") REFERENCES "public"."customer_origins"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "materials" ADD CONSTRAINT "materials_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "materials" ADD CONSTRAINT "materials_category_id_material_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."material_categories"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "service_materials" ADD CONSTRAINT "service_materials_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "service_materials" ADD CONSTRAINT "service_materials_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "services" ADD CONSTRAINT "services_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "services" ADD CONSTRAINT "services_service_type_id_service_types_id_fk" FOREIGN KEY ("service_type_id") REFERENCES "public"."service_types"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "services" ADD CONSTRAINT "services_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "services" ADD CONSTRAINT "services_payment_transaction_id_transactions_id_fk" FOREIGN KEY ("payment_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid()
      AND platform_role = 'super_admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_memberships om
    JOIN public.users u ON u.id = om.user_id
    WHERE u.auth_id = auth.uid()
      AND om.org_id = p_org_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_org_owner(p_org_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_memberships om
    JOIN public.users u ON u.id = om.user_id
    WHERE u.auth_id = auth.uid()
      AND om.org_id = p_org_id
      AND om.role = 'owner'
  )
$$;

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_origins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES — users
-- ============================================================

CREATE POLICY "users_select" ON public.users
  FOR SELECT USING (auth.uid() = auth_id OR public.is_super_admin());

CREATE POLICY "users_insert" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = auth_id);

CREATE POLICY "users_update" ON public.users
  FOR UPDATE USING (auth.uid() = auth_id OR public.is_super_admin());

CREATE POLICY "users_delete" ON public.users
  FOR DELETE USING (public.is_super_admin());

-- ============================================================
-- RLS POLICIES — organizations
-- ============================================================

CREATE POLICY "organizations_select" ON public.organizations
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(id));

CREATE POLICY "organizations_insert" ON public.organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "organizations_update" ON public.organizations
  FOR UPDATE USING (public.is_super_admin() OR public.is_org_owner(id));

CREATE POLICY "organizations_delete" ON public.organizations
  FOR DELETE USING (public.is_super_admin());

-- ============================================================
-- RLS POLICIES — org_memberships
-- ============================================================

CREATE POLICY "org_memberships_select" ON public.org_memberships
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));

CREATE POLICY "org_memberships_insert" ON public.org_memberships
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_owner(org_id));

CREATE POLICY "org_memberships_update" ON public.org_memberships
  FOR UPDATE USING (public.is_super_admin() OR public.is_org_owner(org_id));

CREATE POLICY "org_memberships_delete" ON public.org_memberships
  FOR DELETE USING (public.is_super_admin() OR public.is_org_owner(org_id));

-- ============================================================
-- RLS POLICIES — org_invitations
-- ============================================================

CREATE POLICY "org_invitations_select" ON public.org_invitations
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));

CREATE POLICY "org_invitations_insert" ON public.org_invitations
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_owner(org_id));

CREATE POLICY "org_invitations_update" ON public.org_invitations
  FOR UPDATE USING (public.is_super_admin() OR public.is_org_owner(org_id));

CREATE POLICY "org_invitations_delete" ON public.org_invitations
  FOR DELETE USING (public.is_super_admin() OR public.is_org_owner(org_id));

-- ============================================================
-- RLS POLICIES — subscriptions (gerenciadas pelo super_admin)
-- ============================================================

CREATE POLICY "subscriptions_select" ON public.subscriptions
  FOR SELECT USING (public.is_super_admin() OR public.is_org_owner(org_id));

CREATE POLICY "subscriptions_insert" ON public.subscriptions
  FOR INSERT WITH CHECK (public.is_super_admin());

CREATE POLICY "subscriptions_update" ON public.subscriptions
  FOR UPDATE USING (public.is_super_admin());

CREATE POLICY "subscriptions_delete" ON public.subscriptions
  FOR DELETE USING (public.is_super_admin());

-- ============================================================
-- RLS POLICIES — service_types
-- ============================================================

CREATE POLICY "service_types_select" ON public.service_types
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));

CREATE POLICY "service_types_insert" ON public.service_types
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_owner(org_id));

CREATE POLICY "service_types_update" ON public.service_types
  FOR UPDATE USING (public.is_super_admin() OR public.is_org_owner(org_id));

CREATE POLICY "service_types_delete" ON public.service_types
  FOR DELETE USING (public.is_super_admin() OR public.is_org_owner(org_id));

-- ============================================================
-- RLS POLICIES — material_categories
-- ============================================================

CREATE POLICY "material_categories_select" ON public.material_categories
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));

CREATE POLICY "material_categories_insert" ON public.material_categories
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_owner(org_id));

CREATE POLICY "material_categories_update" ON public.material_categories
  FOR UPDATE USING (public.is_super_admin() OR public.is_org_owner(org_id));

CREATE POLICY "material_categories_delete" ON public.material_categories
  FOR DELETE USING (public.is_super_admin() OR public.is_org_owner(org_id));

-- ============================================================
-- RLS POLICIES — customer_origins
-- ============================================================

CREATE POLICY "customer_origins_select" ON public.customer_origins
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));

CREATE POLICY "customer_origins_insert" ON public.customer_origins
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_owner(org_id));

CREATE POLICY "customer_origins_update" ON public.customer_origins
  FOR UPDATE USING (public.is_super_admin() OR public.is_org_owner(org_id));

CREATE POLICY "customer_origins_delete" ON public.customer_origins
  FOR DELETE USING (public.is_super_admin() OR public.is_org_owner(org_id));

-- ============================================================
-- RLS POLICIES — customers
-- ============================================================

CREATE POLICY "customers_select" ON public.customers
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));

CREATE POLICY "customers_insert" ON public.customers
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_member(org_id));

CREATE POLICY "customers_update" ON public.customers
  FOR UPDATE USING (public.is_super_admin() OR public.is_org_member(org_id));

CREATE POLICY "customers_delete" ON public.customers
  FOR DELETE USING (public.is_super_admin() OR public.is_org_owner(org_id));

-- ============================================================
-- RLS POLICIES — materials
-- ============================================================

CREATE POLICY "materials_select" ON public.materials
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));

CREATE POLICY "materials_insert" ON public.materials
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_member(org_id));

CREATE POLICY "materials_update" ON public.materials
  FOR UPDATE USING (public.is_super_admin() OR public.is_org_member(org_id));

CREATE POLICY "materials_delete" ON public.materials
  FOR DELETE USING (public.is_super_admin() OR public.is_org_owner(org_id));

-- ============================================================
-- RLS POLICIES — transactions (append-only para members)
-- ============================================================

CREATE POLICY "transactions_select" ON public.transactions
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));

CREATE POLICY "transactions_insert" ON public.transactions
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_member(org_id));

CREATE POLICY "transactions_update" ON public.transactions
  FOR UPDATE USING (public.is_super_admin());

CREATE POLICY "transactions_delete" ON public.transactions
  FOR DELETE USING (public.is_super_admin());

-- ============================================================
-- RLS POLICIES — services
-- ============================================================

CREATE POLICY "services_select" ON public.services
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));

CREATE POLICY "services_insert" ON public.services
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_member(org_id));

CREATE POLICY "services_update" ON public.services
  FOR UPDATE USING (public.is_super_admin() OR public.is_org_member(org_id));

CREATE POLICY "services_delete" ON public.services
  FOR DELETE USING (public.is_super_admin() OR public.is_org_owner(org_id));

-- ============================================================
-- RLS POLICIES — service_materials (join sem org_id; herda via services)
-- ============================================================

CREATE POLICY "service_materials_select" ON public.service_materials
  FOR SELECT USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_id AND public.is_org_member(s.org_id)
    )
  );

CREATE POLICY "service_materials_insert" ON public.service_materials
  FOR INSERT WITH CHECK (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_id AND public.is_org_member(s.org_id)
    )
  );

CREATE POLICY "service_materials_update" ON public.service_materials
  FOR UPDATE USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_id AND public.is_org_member(s.org_id)
    )
  );

CREATE POLICY "service_materials_delete" ON public.service_materials
  FOR DELETE USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_id AND public.is_org_owner(s.org_id)
    )
  );

-- ============================================================
-- RLS POLICIES — calendar_events
-- ============================================================

CREATE POLICY "calendar_events_select" ON public.calendar_events
  FOR SELECT USING (public.is_super_admin() OR public.is_org_member(org_id));

CREATE POLICY "calendar_events_insert" ON public.calendar_events
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_org_member(org_id));

CREATE POLICY "calendar_events_update" ON public.calendar_events
  FOR UPDATE USING (public.is_super_admin() OR public.is_org_member(org_id));

CREATE POLICY "calendar_events_delete" ON public.calendar_events
  FOR DELETE USING (public.is_super_admin() OR public.is_org_member(org_id));

-- ============================================================
-- RLS POLICIES — audit_logs (append-only; owner lê, ninguém altera)
-- ============================================================

CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT USING (
    public.is_super_admin() OR (org_id IS NOT NULL AND public.is_org_owner(org_id))
  );

CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (
    public.is_super_admin() OR (org_id IS NOT NULL AND public.is_org_member(org_id))
  );