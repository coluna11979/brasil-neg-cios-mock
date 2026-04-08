-- ============================================
-- Migration: Leads por Corretor
-- Atualiza RLS para corretor ver só seus leads
-- ============================================

-- Remove política antiga (permissiva demais)
DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.leads;

-- SELECT: admin vê tudo, corretor vê só os seus (ou não atribuídos)
CREATE POLICY "Leads visíveis por role" ON public.leads
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
      OR corretor_id = auth.uid()
      OR corretor_id IS NULL
    )
  );

-- UPDATE: admin atualiza tudo, corretor só os seus
CREATE POLICY "Leads atualizáveis por role" ON public.leads
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
      OR corretor_id = auth.uid()
    )
  );
