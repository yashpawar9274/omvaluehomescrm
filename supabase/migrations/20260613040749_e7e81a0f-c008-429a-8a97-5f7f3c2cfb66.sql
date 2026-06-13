-- Notify employee when a follow-up is created/updated with a date
CREATE OR REPLACE FUNCTION public.notify_followup_scheduled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cust TEXT;
  parts TEXT := '';
BEGIN
  IF NEW.employee_id IS NULL THEN RETURN NEW; END IF;

  SELECT customer_name INTO cust FROM public.leads WHERE id = NEW.lead_id;

  IF NEW.next_call_date IS NOT NULL THEN
    parts := parts || ' Call: ' || NEW.next_call_date::text || '.';
  END IF;
  IF NEW.next_visit_date IS NOT NULL THEN
    parts := parts || ' Visit: ' || NEW.next_visit_date::text || '.';
  END IF;

  IF TG_OP = 'INSERT' OR
     NEW.next_call_date IS DISTINCT FROM OLD.next_call_date OR
     NEW.next_visit_date IS DISTINCT FROM OLD.next_visit_date THEN
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (
      NEW.employee_id,
      'Follow-up scheduled',
      'Reminder for ' || COALESCE(cust, 'a lead') || '.' || parts
    );
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_followup_scheduled ON public.follow_ups;
CREATE TRIGGER trg_notify_followup_scheduled
AFTER INSERT OR UPDATE OF next_call_date, next_visit_date ON public.follow_ups
FOR EACH ROW EXECUTE FUNCTION public.notify_followup_scheduled();

-- Function: generate "due today" reminders for the current user (idempotent per day)
CREATE OR REPLACE FUNCTION public.generate_due_followup_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  inserted_count INT := 0;
  rec RECORD;
  msg TEXT;
  marker TEXT;
BEGIN
  IF uid IS NULL THEN RETURN 0; END IF;
  FOR rec IN
    SELECT f.id, f.next_call_date, f.next_visit_date, l.customer_name, l.mobile
    FROM public.follow_ups f
    LEFT JOIN public.leads l ON l.id = f.lead_id
    WHERE f.employee_id = uid
      AND f.status IN ('pending','overdue')
      AND (f.next_call_date = CURRENT_DATE OR f.next_visit_date = CURRENT_DATE)
  LOOP
    marker := 'reminder:' || rec.id::text || ':' || CURRENT_DATE::text;
    IF EXISTS (SELECT 1 FROM public.notifications WHERE user_id = uid AND message LIKE '%' || marker || '%') THEN
      CONTINUE;
    END IF;
    msg := 'Today: ' || COALESCE(rec.customer_name, 'lead') || ' (' || COALESCE(rec.mobile, '') || ')';
    IF rec.next_call_date = CURRENT_DATE THEN msg := msg || ' — call due.'; END IF;
    IF rec.next_visit_date = CURRENT_DATE THEN msg := msg || ' — visit due.'; END IF;
    msg := msg || ' [' || marker || ']';
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (uid, 'Follow-up reminder', msg);
    inserted_count := inserted_count + 1;
  END LOOP;
  RETURN inserted_count;
END; $$;

GRANT EXECUTE ON FUNCTION public.generate_due_followup_reminders() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_followup_scheduled() TO authenticated;