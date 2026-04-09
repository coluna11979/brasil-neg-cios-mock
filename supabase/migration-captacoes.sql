-- Tabela de captações (negócios que o corretor está tentando trazer para a plataforma)
CREATE TABLE IF NOT EXISTS captacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  corretor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  nome_negocio TEXT NOT NULL,
  tipo TEXT,
  endereco TEXT,
  contato_nome TEXT,
  contato_telefone TEXT,
  valor_estimado NUMERIC,
  observacoes TEXT,
  status TEXT DEFAULT 'prospeccao'
    CHECK (status IN ('prospeccao', 'contato-feito', 'visita-agendada', 'captado', 'perdido')),
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS captacoes_corretor_id_idx ON captacoes(corretor_id);
CREATE INDEX IF NOT EXISTS captacoes_status_idx ON captacoes(status);

-- RLS
ALTER TABLE captacoes ENABLE ROW LEVEL SECURITY;

-- Admin vê tudo
CREATE POLICY "admin_all_captacoes" ON captacoes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Corretor vê e edita apenas as próprias
CREATE POLICY "corretor_own_captacoes" ON captacoes
  FOR ALL USING (corretor_id = auth.uid());

-- Trigger para atualizar atualizado_em
CREATE OR REPLACE FUNCTION update_captacoes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER captacoes_updated_at
  BEFORE UPDATE ON captacoes
  FOR EACH ROW EXECUTE FUNCTION update_captacoes_timestamp();
