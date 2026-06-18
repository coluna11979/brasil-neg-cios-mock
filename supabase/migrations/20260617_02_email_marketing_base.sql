-- ============================================================
-- 02 — Tabelas base de Email Marketing
-- ============================================================
-- Adapta o pacote pra realidade deste projeto:
--   - leads usa colunas em PT (nome, telefone, corretor_id, criado_em, status, origem, tipo_lead)
--   - Sem team_members → created_by aponta pra auth.users
--   - Sem deals → trigger só dispara em leads
--   - Sem pipeline_stage_id em leads → triggers só usam INSERT (lead_created)
-- Single-tenant: RLS aberta `FOR ALL TO authenticated USING (true)`.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================
-- 1. Colunas mínimas que faltam em leads (LGPD + segmentação)
-- ============================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS email_opted_out boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_leads_email_opt ON public.leads(email_opted_out) WHERE email_opted_out = false;
CREATE INDEX IF NOT EXISTS idx_leads_tags_gin ON public.leads USING gin(tags);

-- ============================================================
-- 2. Tabelas
-- ============================================================

-- 2.1 Templates de email
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text,
  preheader text,
  content_json jsonb,
  html_content text,
  thumbnail_url text,
  category text DEFAULT 'general',
  is_active boolean DEFAULT true,
  last_used_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2.2 Listas (segmentos dinâmicos opcionais)
CREATE TABLE IF NOT EXISTS public.email_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  criteria jsonb DEFAULT '{}'::jsonb,
  is_dynamic boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2.3 Unsubscribes (LGPD — fonte de verdade pra opt-out por email)
CREATE TABLE IF NOT EXISTS public.email_unsubscribes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  unsubscribed_at timestamptz DEFAULT now(),
  reason text
);

-- 2.4 Subscribers (consent + status por email)
CREATE TABLE IF NOT EXISTS public.email_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'subscribed'
    CHECK (status IN ('subscribed','unsubscribed','bounced','complained')),
  unsubscribe_token uuid DEFAULT gen_random_uuid() UNIQUE,
  consent_source text,
  consent_at timestamptz,
  consent_ip text,
  unsubscribed_at timestamptz,
  bounce_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2.5 Automações (React Flow) — placeholder pra fase 2 do UI
CREATE TABLE IF NOT EXISTS public.email_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  trigger_event text,
  trigger_filter jsonb DEFAULT '{}'::jsonb,
  flow_json jsonb,
  is_active boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2.6 Campanhas
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  subject text NOT NULL,
  preheader text,
  template_id uuid REFERENCES public.email_templates(id) ON DELETE SET NULL,
  content_json jsonb,
  html_content text,
  html_cache text,
  list_id uuid REFERENCES public.email_lists(id) ON DELETE SET NULL,
  audience_filters jsonb DEFAULT '{}'::jsonb,
  from_name text,
  from_email text,
  reply_to text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','scheduled','sending','sent','completed','failed','cancelled')),
  source_type text NOT NULL DEFAULT 'campaign'
    CHECK (source_type IN ('campaign','automation','test')),
  automation_id uuid REFERENCES public.email_automations(id) ON DELETE SET NULL,
  scheduled_at timestamptz,
  started_at timestamptz,
  sent_at timestamptz,
  completed_at timestamptz,
  total_leads int DEFAULT 0,
  total_recipients int DEFAULT 0,
  sent_count int DEFAULT 0,
  failed_count int DEFAULT 0,
  total_sent int DEFAULT 0,
  total_delivered int DEFAULT 0,
  total_opened int DEFAULT 0,
  total_clicked int DEFAULT 0,
  total_bounced int DEFAULT 0,
  total_unsubscribed int DEFAULT 0,
  settings jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2.7 Campaign leads (mirror de destinatários antes do envio)
CREATE TABLE IF NOT EXISTS public.email_campaign_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  email text NOT NULL,
  status text DEFAULT 'pending'
    CHECK (status IN ('pending','sending','sent','delivered','opened','clicked','bounced','complained','failed')),
  resend_id text,
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  bounced_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (campaign_id, email)
);

-- 2.8 Sends (histórico individual de cada email enviado)
CREATE TABLE IF NOT EXISTS public.email_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  automation_run_id uuid,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  email text NOT NULL,
  resend_id text,
  status text DEFAULT 'pending'
    CHECK (status IN ('pending','sent','delivered','opened','clicked','bounced','complained','failed')),
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  open_count int DEFAULT 0,
  clicked_at timestamptz,
  click_count int DEFAULT 0,
  clicked_url text,
  bounced_at timestamptz,
  bounce_reason text,
  error_message text,
  html text,
  user_agent text,
  device_type text,
  unsubscribed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 2.9 Eventos brutos do webhook Resend
CREATE TABLE IF NOT EXISTS public.email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  send_id uuid REFERENCES public.email_sends(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- 2.10 Runs de automação
CREATE TABLE IF NOT EXISTS public.email_automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid REFERENCES public.email_automations(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  current_node_id text,
  scheduled_next_at timestamptz,
  status text DEFAULT 'active'
    CHECK (status IN ('active','completed','paused','failed','cancelled')),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  context jsonb DEFAULT '{}'::jsonb,
  UNIQUE (automation_id, lead_id)
);

-- ============================================================
-- 3. Índices
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_email_templates_name ON public.email_templates(name);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON public.email_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_email_lists_active ON public.email_lists(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_email_subscribers_lead ON public.email_subscribers(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_status ON public.email_subscribers(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON public.email_campaigns(status) WHERE status IN ('scheduled','sending');
CREATE INDEX IF NOT EXISTS idx_email_campaigns_source ON public.email_campaigns(source_type);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_automation ON public.email_campaigns(automation_id) WHERE automation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_campaign_leads_campaign ON public.email_campaign_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_campaign_leads_status ON public.email_campaign_leads(status);
CREATE INDEX IF NOT EXISTS idx_email_sends_campaign ON public.email_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_lead ON public.email_sends(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_resend ON public.email_sends(resend_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_status ON public.email_sends(status);
CREATE INDEX IF NOT EXISTS idx_email_events_send ON public.email_events(send_id);
CREATE INDEX IF NOT EXISTS idx_email_automations_active ON public.email_automations(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_automation_runs_scheduled ON public.email_automation_runs(scheduled_next_at) WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS email_events_unique_event ON public.email_events (send_id, event_type, (payload->>'created_at'));

-- ============================================================
-- 4. Trigger updated_at compartilhado
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_email_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'email_templates','email_lists','email_subscribers',
    'email_campaigns','email_automations'
  ]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_email_updated_at()',
      t, t
    );
  END LOOP;
END $$;

-- ============================================================
-- 5. RLS — authenticated all (single-tenant)
-- ============================================================

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaign_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_automation_runs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'email_templates','email_lists','email_subscribers','email_unsubscribes',
    'email_campaigns','email_campaign_leads','email_sends','email_events',
    'email_automations','email_automation_runs'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_authenticated_all ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_authenticated_all ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      t, t
    );
  END LOOP;
END $$;

-- ============================================================
-- 6. Storage bucket pra imagens de email
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('email-assets', 'email-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='email_assets_public_read' AND schemaname='storage') THEN
    CREATE POLICY email_assets_public_read ON storage.objects FOR SELECT
    USING (bucket_id = 'email-assets');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='email_assets_authenticated_write' AND schemaname='storage') THEN
    CREATE POLICY email_assets_authenticated_write ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'email-assets');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='email_assets_authenticated_update' AND schemaname='storage') THEN
    CREATE POLICY email_assets_authenticated_update ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'email-assets');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='email_assets_authenticated_delete' AND schemaname='storage') THEN
    CREATE POLICY email_assets_authenticated_delete ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'email-assets');
  END IF;
END $$;

-- ============================================================
-- 7. Comments
-- ============================================================

COMMENT ON TABLE public.email_templates IS 'Templates reutilizáveis pra campanhas e automações.';
COMMENT ON TABLE public.email_campaigns IS 'Campanhas de email one-shot.';
COMMENT ON TABLE public.email_campaign_leads IS 'Destinatários por campanha. UNIQUE(campaign_id,email).';
COMMENT ON TABLE public.email_sends IS 'Histórico de envios individuais. Mirror dos eventos Resend.';
COMMENT ON TABLE public.email_events IS 'Auditoria bruta dos webhooks Resend.';
COMMENT ON TABLE public.email_automations IS 'Fluxos visuais (React Flow). UI fase 2.';
COMMENT ON TABLE public.email_automation_runs IS 'Execuções: 1 por lead × automação.';
COMMENT ON TABLE public.email_unsubscribes IS 'LGPD: fonte de verdade pra opt-out por email.';
COMMENT ON COLUMN public.leads.email_opted_out IS 'LGPD: lead marcou opt-out diretamente (sem precisar de email_unsubscribes).';
COMMENT ON COLUMN public.leads.tags IS 'Tags pra segmentação de audiência em campanhas.';

SELECT 'email marketing base ok' as result;
