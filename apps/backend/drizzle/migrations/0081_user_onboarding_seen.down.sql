ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_onboarding_seen_bounded;
ALTER TABLE public.users DROP COLUMN IF EXISTS "onboarding_seen";
