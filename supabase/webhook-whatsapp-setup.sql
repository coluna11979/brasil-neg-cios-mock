-- ============================================================
-- SETUP WEBHOOK WHATSAPP — Execute no SQL Editor do Supabase
-- Permite que a Edge Function receive-whatsapp grave mensagens
-- sem autenticação (service_role via secret)
-- ============================================================

-- Permite INSERT na tabela lead_messages para a role service_role
-- (a Edge Function usa SUPABASE_SERVICE_ROLE_KEY)
GRANT INSERT ON public.lead_messages TO service_role;
GRANT SELECT ON public.leads TO service_role;
GRANT SELECT ON public.lead_messages TO service_role;

-- Verifica grants atuais
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name IN ('lead_messages', 'leads')
ORDER BY table_name, grantee;
