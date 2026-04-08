-- ============================================================
-- HABILITAR REALTIME NA TABELA lead_messages
-- Execute no SQL Editor do Supabase
-- ============================================================

-- Necessário para o Supabase Realtime funcionar com postgres_changes
ALTER TABLE public.lead_messages REPLICA IDENTITY FULL;

-- Adiciona a tabela na publicação do Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_messages;

-- Verifica
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
