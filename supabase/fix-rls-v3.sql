-- =============================================
-- FIX V3 - Diagnóstico e correção definitiva
-- Rode no SQL Editor do Supabase
-- =============================================

-- 1. Ver quais policies existem atualmente na tabela leads
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'leads';
