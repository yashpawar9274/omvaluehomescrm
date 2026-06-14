ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS flat_type public.flat_type;
NOTIFY pgrst, 'reload schema';