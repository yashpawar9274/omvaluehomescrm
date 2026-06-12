
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'employee');
CREATE TYPE public.lead_status AS ENUM ('new','contacted','visit_scheduled','visit_done','follow_up','booking','lost');
CREATE TYPE public.lead_source AS ENUM ('facebook_ads','google_ads','website','walk_in','reference','whatsapp','property_portal');
CREATE TYPE public.flat_type AS ENUM ('1bhk','2bhk','3bhk','shop','office');
CREATE TYPE public.interest_level AS ENUM ('hot','warm','cold');
CREATE TYPE public.followup_status AS ENUM ('pending','completed','missed','overdue');
CREATE TYPE public.booking_status AS ENUM ('interested','token_paid','confirmed','registered');

-- Profiles (employees)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT,
  mobile TEXT,
  designation TEXT,
  joining_date DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin'::public.app_role)
$$;

-- Leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT,
  city TEXT,
  budget_min NUMERIC,
  budget_max NUMERIC,
  source public.lead_source,
  status public.lead_status NOT NULL DEFAULT 'new',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Visits
CREATE TABLE public.visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  project_name TEXT,
  tower_name TEXT,
  wing TEXT,
  visit_date DATE NOT NULL,
  visit_time TIME,
  flat_type public.flat_type,
  flat_number TEXT,
  floor_number TEXT,
  budget_min NUMERIC,
  budget_max NUMERIC,
  interest_level public.interest_level,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visits TO authenticated;
GRANT ALL ON public.visits TO service_role;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

-- Follow-ups
CREATE TABLE public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES public.visits(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  next_visit_date DATE,
  next_call_date DATE,
  notes TEXT,
  status public.followup_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.follow_ups TO authenticated;
GRANT ALL ON public.follow_ups TO service_role;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

-- Bookings
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  flat_number TEXT,
  booking_amount NUMERIC,
  booking_date DATE,
  status public.booking_status NOT NULL DEFAULT 'interested',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
-- profiles: each user sees own; admin sees all
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "profiles admin insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "profiles admin delete" ON public.profiles FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- user_roles: user can see own roles, admin all
CREATE POLICY "roles self read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- leads: admin all, employees see assigned/created
CREATE POLICY "leads read" ON public.leads FOR SELECT TO authenticated USING (public.is_admin(auth.uid()) OR assigned_to = auth.uid() OR created_by = auth.uid());
CREATE POLICY "leads insert" ON public.leads FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "leads update" ON public.leads FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR assigned_to = auth.uid() OR created_by = auth.uid());
CREATE POLICY "leads delete" ON public.leads FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- visits: admin all, employees own
CREATE POLICY "visits read" ON public.visits FOR SELECT TO authenticated USING (public.is_admin(auth.uid()) OR employee_id = auth.uid());
CREATE POLICY "visits insert" ON public.visits FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "visits update" ON public.visits FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR employee_id = auth.uid());
CREATE POLICY "visits delete" ON public.visits FOR DELETE TO authenticated USING (public.is_admin(auth.uid()) OR employee_id = auth.uid());

CREATE POLICY "followups read" ON public.follow_ups FOR SELECT TO authenticated USING (public.is_admin(auth.uid()) OR employee_id = auth.uid());
CREATE POLICY "followups insert" ON public.follow_ups FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "followups update" ON public.follow_ups FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR employee_id = auth.uid());
CREATE POLICY "followups delete" ON public.follow_ups FOR DELETE TO authenticated USING (public.is_admin(auth.uid()) OR employee_id = auth.uid());

CREATE POLICY "bookings read" ON public.bookings FOR SELECT TO authenticated USING (public.is_admin(auth.uid()) OR employee_id = auth.uid());
CREATE POLICY "bookings insert" ON public.bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "bookings update" ON public.bookings FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR employee_id = auth.uid());
CREATE POLICY "bookings delete" ON public.bookings FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "notifications read" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_followups_updated BEFORE UPDATE ON public.follow_ups FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- New user trigger: create profile; first user becomes admin, rest employees
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INTEGER;
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.email);

  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'employee');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
