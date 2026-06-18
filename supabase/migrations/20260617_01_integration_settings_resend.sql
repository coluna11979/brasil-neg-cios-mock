-- ============================================================
-- 01 — Estende integration_settings com credenciais Resend
-- ============================================================
-- Reusa a tabela singleton de config (id=1) que já guarda UAZAPI/Google.
-- Sem tabela nova. Sem hardcoded. Tudo lido do banco em runtime.
-- ============================================================

ALTER TABLE public.integration_settings
  ADD COLUMN IF NOT EXISTS resend_api_key text,
  ADD COLUMN IF NOT EXISTS resend_webhook_secret text,
  ADD COLUMN IF NOT EXISTS from_email text,
  ADD COLUMN IF NOT EXISTS from_name text,
  ADD COLUMN IF NOT EXISTS reply_to text,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS company_address text,
  ADD COLUMN IF NOT EXISTS app_url text,
  ADD COLUMN IF NOT EXISTS email_active boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_domain_verified boolean DEFAULT false;

-- Garante que a row singleton (id=1) existe
INSERT INTO public.integration_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

COMMENT ON COLUMN public.integration_settings.resend_api_key IS 'Resend API key (lido em runtime pelas edge functions de email).';
COMMENT ON COLUMN public.integration_settings.resend_webhook_secret IS 'Resend webhook secret pra validar svix-signature em process-email-event.';
COMMENT ON COLUMN public.integration_settings.email_active IS 'Habilita envio de email. Edges abortam se false.';
COMMENT ON COLUMN public.integration_settings.email_domain_verified IS 'Marcador manual: domínio verificado no Resend.';

SELECT 'integration_settings estendido com colunas Resend' as result;
