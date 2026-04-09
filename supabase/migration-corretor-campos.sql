-- Novos campos no perfil do corretor: motivação, objetivo e comprometimento
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS motivacao TEXT,
  ADD COLUMN IF NOT EXISTS objetivo TEXT,
  ADD COLUMN IF NOT EXISTS comprometido BOOLEAN DEFAULT FALSE;
