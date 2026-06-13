
-- 1) Update handle_new_user: yash.pawar@theemcoe.org -> admin; first user -> admin; others -> sales
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_count INTEGER;
  assigned_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.email);

  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  IF NEW.email = 'yash.pawar@theemcoe.org' OR user_count = 0 THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'sales';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $function$;

-- 2) Promote yash if already exists
DO $$
DECLARE u uuid;
BEGIN
  SELECT id INTO u FROM auth.users WHERE email = 'yash.pawar@theemcoe.org' LIMIT 1;
  IF u IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (u, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- 3) Notification on lead assignment
CREATE OR REPLACE FUNCTION public.notify_lead_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to) THEN
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (
      NEW.assigned_to,
      'New lead assigned',
      'Lead "' || COALESCE(NEW.customer_name, 'Unnamed') || '" assigned to you. Mobile: ' || COALESCE(NEW.mobile, '—')
    );
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_lead_assignment ON public.leads;
CREATE TRIGGER trg_notify_lead_assignment
AFTER INSERT OR UPDATE OF assigned_to ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.notify_lead_assignment();

-- 4) Realtime publication
ALTER TABLE public.leads REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.follow_ups REPLICA IDENTITY FULL;
ALTER TABLE public.visits REPLICA IDENTITY FULL;
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
ALTER TABLE public.user_roles REPLICA IDENTITY FULL;

DO $$
BEGIN
  PERFORM 1 FROM pg_publication WHERE pubname = 'supabase_realtime';
  IF FOUND THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.leads; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.follow_ups; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.visits; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- 5) Allow admins to manage user_roles (insert/update/delete)
DROP POLICY IF EXISTS "user_roles admin manage" ON public.user_roles;
CREATE POLICY "user_roles admin manage" ON public.user_roles
FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 6) Allow admins to see all profiles (for employee assignment UI)
DROP POLICY IF EXISTS "profiles admin select all" ON public.profiles;
CREATE POLICY "profiles admin select all" ON public.profiles
FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR id = auth.uid());

-- 7) Allow admins to read all user_roles (to show team roles)
DROP POLICY IF EXISTS "user_roles admin read all" ON public.user_roles;
CREATE POLICY "user_roles admin read all" ON public.user_roles
FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR user_id = auth.uid());
