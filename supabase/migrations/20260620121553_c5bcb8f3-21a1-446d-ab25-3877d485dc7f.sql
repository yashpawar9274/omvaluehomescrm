
-- 1. call_logs: restrict SELECT
DROP POLICY IF EXISTS "Authenticated can read call logs" ON public.call_logs;
CREATE POLICY "Employees read own call logs"
  ON public.call_logs FOR SELECT TO authenticated
  USING (employee_id = auth.uid() OR public.is_admin(auth.uid()));

-- 2. notifications: remove broad INSERT (triggers run as SECURITY DEFINER and bypass RLS)
DROP POLICY IF EXISTS "notifications insert" ON public.notifications;

-- 3. bookings / visits / follow_ups: enforce employee_id = auth.uid() (admins exempt)
DROP POLICY IF EXISTS "bookings insert" ON public.bookings;
CREATE POLICY "bookings insert"
  ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (employee_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "visits insert" ON public.visits;
CREATE POLICY "visits insert"
  ON public.visits FOR INSERT TO authenticated
  WITH CHECK (employee_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "followups insert" ON public.follow_ups;
CREATE POLICY "followups insert"
  ON public.follow_ups FOR INSERT TO authenticated
  WITH CHECK (employee_id = auth.uid() OR public.is_admin(auth.uid()));

-- 4. Lock down SECURITY DEFINER functions
-- Internal trigger/helper functions: revoke EXECUTE entirely (triggers fire as table owner)
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_lead_assignment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_followup_scheduled() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.after_call_log_insert() FROM PUBLIC, anon, authenticated;

-- App-callable helpers: revoke from anon, keep for authenticated
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.generate_due_followup_reminders() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_due_followup_reminders() TO authenticated;
