-- ============================================
-- NegócioJá - Database Migration
-- ============================================

-- 1. LEADS TABLE (captured from website forms, chatbot, etc.)
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  mensagem TEXT,
  origem TEXT NOT NULL DEFAULT 'contato-negocio',
  status TEXT NOT NULL DEFAULT 'novo',
  negocio_id TEXT,
  negocio_titulo TEXT,
  galeria_id TEXT,
  galeria_nome TEXT,
  espaco_id TEXT,
  espaco_numero TEXT,
  corretor_id UUID REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 2. PROFILES TABLE (admin and corretores)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  role TEXT NOT NULL DEFAULT 'corretor',
  avatar_url TEXT,
  creci TEXT,
  regiao TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 3. NEGOCIOS TABLE (businesses for sale, submitted by owners)
CREATE TABLE IF NOT EXISTS public.negocios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  categoria TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'venda',
  cidade TEXT NOT NULL,
  estado TEXT NOT NULL,
  preco NUMERIC,
  faturamento_mensal NUMERIC,
  area_m2 NUMERIC,
  descricao TEXT,
  descricao_completa TEXT,
  imagem TEXT,
  imagens TEXT[],
  destaque BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pendente',
  proprietario_nome TEXT,
  proprietario_telefone TEXT,
  proprietario_email TEXT,
  corretor_id UUID REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 4. GALERIAS TABLE
CREATE TABLE IF NOT EXISTS public.galerias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  endereco TEXT NOT NULL,
  cidade TEXT NOT NULL,
  estado TEXT NOT NULL,
  descricao TEXT,
  imagem TEXT,
  corretor_id UUID REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 5. ESPACOS_GALERIA TABLE
CREATE TABLE IF NOT EXISTS public.espacos_galeria (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  galeria_id UUID REFERENCES public.galerias(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'loja',
  area_m2 NUMERIC,
  valor_aluguel NUMERIC,
  andar TEXT,
  descricao TEXT,
  disponivel BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 6. Enable Row Level Security
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negocios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galerias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.espacos_galeria ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies

-- Leads: anyone can INSERT (public forms), authenticated can SELECT/UPDATE
CREATE POLICY "Anyone can create leads" ON public.leads
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can view leads" ON public.leads
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update leads" ON public.leads
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Profiles: authenticated can view, users can update own
CREATE POLICY "Authenticated can view profiles" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Negocios: public can read published, authenticated can manage
CREATE POLICY "Anyone can view published negocios" ON public.negocios
  FOR SELECT USING (status = 'publicado' OR auth.role() = 'authenticated');

CREATE POLICY "Anyone can submit negocios" ON public.negocios
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated can update negocios" ON public.negocios
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Galerias: public read, authenticated manage
CREATE POLICY "Anyone can view galerias" ON public.galerias
  FOR SELECT USING (true);

CREATE POLICY "Authenticated can manage galerias" ON public.galerias
  FOR ALL USING (auth.role() = 'authenticated');

-- Espacos: public read, authenticated manage
CREATE POLICY "Anyone can view espacos" ON public.espacos_galeria
  FOR SELECT USING (true);

CREATE POLICY "Authenticated can manage espacos" ON public.espacos_galeria
  FOR ALL USING (auth.role() = 'authenticated');

-- 8. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'corretor')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER negocios_updated_at BEFORE UPDATE ON public.negocios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
