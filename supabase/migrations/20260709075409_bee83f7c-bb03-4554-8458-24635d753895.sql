
CREATE TABLE public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile TEXT NOT NULL UNIQUE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT,
  status TEXT NOT NULL DEFAULT 'ai',
  handoff_requested BOOLEAN NOT NULL DEFAULT false,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_preview TEXT,
  ai_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_conversations TO authenticated;
GRANT ALL ON public.whatsapp_conversations TO service_role;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_conv_select" ON public.whatsapp_conversations FOR SELECT TO authenticated
  USING (assigned_to = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "wa_conv_update" ON public.whatsapp_conversations FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (assigned_to = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "wa_conv_admin_all" ON public.whatsapp_conversations FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_wa_conv_updated BEFORE UPDATE ON public.whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('in','out')),
  sender TEXT NOT NULL CHECK (sender IN ('customer','ai','agent','system')),
  body TEXT,
  wa_message_id TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.whatsapp_messages TO authenticated;
GRANT ALL ON public.whatsapp_messages TO service_role;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_msg_select" ON public.whatsapp_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.whatsapp_conversations c
    WHERE c.id = conversation_id
      AND (c.assigned_to = auth.uid() OR public.is_admin(auth.uid()))
  ));
CREATE POLICY "wa_msg_insert_agent" ON public.whatsapp_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender = 'agent' AND
    EXISTS (
      SELECT 1 FROM public.whatsapp_conversations c
      WHERE c.id = conversation_id
        AND (c.assigned_to = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

CREATE INDEX idx_wa_msg_conv ON public.whatsapp_messages(conversation_id, created_at DESC);
CREATE INDEX idx_wa_conv_last ON public.whatsapp_conversations(last_message_at DESC);
