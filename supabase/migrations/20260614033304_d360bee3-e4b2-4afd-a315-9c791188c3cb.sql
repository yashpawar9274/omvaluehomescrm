
-- 1) Lead quick-status columns
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS last_call_response TEXT,
  ADD COLUMN IF NOT EXISTS last_called_at TIMESTAMPTZ;

-- 2) call_logs table
CREATE TABLE IF NOT EXISTS public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_logs TO authenticated;
GRANT ALL ON public.call_logs TO service_role;

ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read call logs"
  ON public.call_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Employees insert own call logs"
  ON public.call_logs FOR INSERT TO authenticated
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Employees update own call logs"
  ON public.call_logs FOR UPDATE TO authenticated
  USING (employee_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (employee_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Employees delete own call logs"
  ON public.call_logs FOR DELETE TO authenticated
  USING (employee_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_call_logs_lead ON public.call_logs(lead_id, created_at DESC);

-- 3) Trigger: after a call log insert -> bump lead + notify admins
CREATE OR REPLACE FUNCTION public.after_call_log_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lead_row public.leads%ROWTYPE;
  emp_name TEXT;
  admin_id UUID;
BEGIN
  UPDATE public.leads
    SET last_call_response = NEW.response,
        last_called_at = NEW.created_at,
        updated_at = now()
    WHERE id = NEW.lead_id
  RETURNING * INTO lead_row;

  SELECT COALESCE(name, email) INTO emp_name FROM public.profiles WHERE id = NEW.employee_id;

  FOR admin_id IN
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    IF admin_id <> NEW.employee_id THEN
      INSERT INTO public.notifications (user_id, title, message)
      VALUES (
        admin_id,
        'Call update: ' || COALESCE(lead_row.customer_name, 'Lead'),
        COALESCE(emp_name, 'Employee') || ' marked: ' || NEW.response ||
        CASE WHEN NEW.notes IS NOT NULL AND NEW.notes <> '' THEN ' — ' || NEW.notes ELSE '' END
      );
    END IF;
  END LOOP;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_after_call_log_insert ON public.call_logs;
CREATE TRIGGER trg_after_call_log_insert
AFTER INSERT ON public.call_logs
FOR EACH ROW EXECUTE FUNCTION public.after_call_log_insert();

-- 4) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_logs;
