-- 0036 down — remove a policy de UPDATE de customer_attachments.
DROP POLICY IF EXISTS "customer_attachments_update" ON public.customer_attachments;
