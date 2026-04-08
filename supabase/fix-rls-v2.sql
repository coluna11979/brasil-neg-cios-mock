-- =============================================
-- FIX COMPLETO - Permissões + RLS para leads
-- Rode no SQL Editor do Supabase
-- =============================================

-- 1. Garantir permissões de tabela para os roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT ON public.leads TO anon;
GRANT ALL ON public.leads TO authenticated;

-- 2. Remover TODAS as policies existentes da tabela leads
DROP POLICY IF EXISTS "Anyone can create leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.leads;
DROP POLICY IF EXISTS "Enable insert for anon" ON public.leads;
DROP POLICY IF EXISTS "Enable read for authenticated" ON public.leads;

-- 3. Recriar policies corretas
CREATE POLICY "anon_insert_leads" ON public.leads
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "auth_insert_leads" ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "auth_select_leads" ON public.leads
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "auth_update_leads" ON public.leads
  FOR UPDATE TO authenticated
  USING (true);
