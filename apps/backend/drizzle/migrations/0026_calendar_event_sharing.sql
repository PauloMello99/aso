-- 0026 — F6: eventos de agenda compartilhados + RSVP.
-- visibility em calendar_events (private por padrão — nenhum evento existente vaza para
-- a organização) e tabela calendar_event_attendees para o RSVP dos convidados.
DO $$ BEGIN
  CREATE TYPE "calendar_event_visibility" AS ENUM ('private', 'shared');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "calendar_attendee_status" AS ENUM ('going', 'not_going');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "visibility" "calendar_event_visibility" DEFAULT 'private' NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "calendar_event_attendees" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" uuid NOT NULL REFERENCES "calendar_events"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "status" "calendar_attendee_status" NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "calendar_event_attendees_event_user_uq" ON "calendar_event_attendees" ("event_id","user_id");
--> statement-breakpoint
ALTER TABLE public.calendar_event_attendees ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- RLS POLICIES — calendar_event_attendees (join sem org_id; herda via calendar_events)
CREATE POLICY "calendar_event_attendees_select" ON public.calendar_event_attendees
  FOR SELECT USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.calendar_events e
      WHERE e.id = event_id AND public.is_org_member(e.org_id)
    )
  );
--> statement-breakpoint
CREATE POLICY "calendar_event_attendees_insert" ON public.calendar_event_attendees
  FOR INSERT WITH CHECK (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.calendar_events e
      WHERE e.id = event_id AND public.is_org_member(e.org_id)
    )
  );
--> statement-breakpoint
CREATE POLICY "calendar_event_attendees_update" ON public.calendar_event_attendees
  FOR UPDATE USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.calendar_events e
      WHERE e.id = event_id AND public.is_org_member(e.org_id)
    )
  );
--> statement-breakpoint
CREATE POLICY "calendar_event_attendees_delete" ON public.calendar_event_attendees
  FOR DELETE USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.calendar_events e
      WHERE e.id = event_id AND public.is_org_member(e.org_id)
    )
  );
