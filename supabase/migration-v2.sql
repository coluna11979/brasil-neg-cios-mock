-- =============================================
-- MIGRATION V2 - Mensagens + melhorias
-- Rode no SQL Editor do Supabase
-- =============================================

-- 1. Tabela de mensagens entre corretor e lead
CREATE TABLE IF NOT EXISTS public.lead_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('corretor', 'lead')),
  sender_id UUID REFERENCES auth.users(id),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. RLS para lead_messages
ALTER TABLE public.lead_messages ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.lead_messages TO authenticated;

CREATE POLICY "auth_select_messages" ON public.lead_messages
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "auth_insert_messages" ON public.lead_messages
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "auth_update_messages" ON public.lead_messages
  FOR UPDATE TO authenticated
  USING (true);

-- 3. Adicionar campo telefone e melhorias na tabela leads (se não existirem)
-- Estes campos já existem, mas garantir que email da tabela aceite nulos
-- (não precisa alterar se já funciona)

-- 4. Garantir que a tabela negocios aceita INSERT de anon (para formulário público)
GRANT SELECT, INSERT ON public.negocios TO anon;
GRANT ALL ON public.negocios TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

DROP POLICY IF EXISTS "Anyone can create negocios" ON public.negocios;
DROP POLICY IF EXISTS "Authenticated users can view negocios" ON public.negocios;
DROP POLICY IF EXISTS "Authenticated users can update negocios" ON public.negocios;

CREATE POLICY "anon_insert_negocios" ON public.negocios
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "auth_insert_negocios" ON public.negocios
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "anon_select_negocios" ON public.negocios
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "auth_select_negocios" ON public.negocios
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "auth_update_negocios" ON public.negocios
  FOR UPDATE TO authenticated
  USING (true);
