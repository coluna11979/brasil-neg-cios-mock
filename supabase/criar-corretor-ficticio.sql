-- ============================================================
-- CRIAR CORRETOR FICTÍCIO — Execute no SQL Editor do Supabase
-- Supabase Dashboard → SQL Editor → New query → cole e rode
-- ============================================================

-- 1. Cria o usuário na autenticação (confirma email automaticamente)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  raw_app_meta_data,
  aud,
  role,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'ana.santos@corretora.com',
  crypt('Corretor2024', gen_salt('bf')),
  now(),  -- email já confirmado
  '{"nome": "Ana Santos"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  'authenticated',
  'authenticated',
  now(),
  now(),
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- 2. Cria o perfil (ativo = false = aguardando aprovação do admin)
INSERT INTO public.profiles (
  id,
  nome,
  email,
  telefone,
  role,
  creci,
  regiao,
  ativo,
  criado_em
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'Ana Santos',
  'ana.santos@corretora.com',
  '11987654321',
  'corretor',
  'CRECI-SP 12345',
  'Zona Sul / Santo Amaro',
  false,
  now()
) ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  ativo = false;

-- 3. Confirmar resultado
SELECT id, nome, email, telefone, creci, regiao, ativo, criado_em
FROM public.profiles
WHERE role = 'corretor'
ORDER BY criado_em DESC;
