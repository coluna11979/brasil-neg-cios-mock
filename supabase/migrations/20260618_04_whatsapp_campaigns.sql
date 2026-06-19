-- ============================================================
-- 04 — WhatsApp Marketing via UAZapi
-- ============================================================

CREATE TABLE IF NOT EXISTS whatsapp_campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  message text NOT NULL,
  audience_filters jsonb DEFAULT '{}',
  status text DEFAULT 'draft' CHECK (status IN ('draft','sending','completed','cancelled','failed')),
  total_recipients integer DEFAULT 0,
  total_sent integer DEFAULT 0,
  total_failed integer DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_wc" ON whatsapp_campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS whatsapp_campaign_leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES whatsapp_campaigns(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id),
  phone text NOT NULL,
  nome text,
  status text DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_campaign_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_wcl" ON whatsapp_campaign_leads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_wcl_campaign ON whatsapp_campaign_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_wcl_status ON whatsapp_campaign_leads(campaign_id, status);

-- RPC: contagem de audiência WhatsApp (por telefone)
CREATE OR REPLACE FUNCTION public.get_whatsapp_audience_count(p_filters jsonb DEFAULT '{}'::jsonb)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count INT;
BEGIN
  IF p_filters ? 'lead_ids' AND jsonb_array_length(p_filters->'lead_ids') > 0 THEN
    SELECT count(*) INTO v_count FROM leads l
    WHERE l.id::text IN (SELECT jsonb_array_elements_text(p_filters->'lead_ids'))
      AND l.telefone IS NOT NULL AND l.telefone <> '';
    RETURN v_count;
  END IF;

  SELECT count(*) INTO v_count FROM leads l
  WHERE l.telefone IS NOT NULL AND l.telefone <> ''
    AND (p_filters->'statuses' IS NULL OR jsonb_array_length(p_filters->'statuses') = 0
         OR l.status IN (SELECT jsonb_array_elements_text(p_filters->'statuses')))
    AND (p_filters->'origens' IS NULL OR jsonb_array_length(p_filters->'origens') = 0
         OR l.origem IN (SELECT jsonb_array_elements_text(p_filters->'origens')))
    AND (p_filters->'tipos' IS NULL OR jsonb_array_length(p_filters->'tipos') = 0
         OR l.tipo_lead IN (SELECT jsonb_array_elements_text(p_filters->'tipos')))
    AND (p_filters->'tags_any' IS NULL OR jsonb_array_length(p_filters->'tags_any') = 0
         OR l.tags && ARRAY(SELECT jsonb_array_elements_text(p_filters->'tags_any')))
    AND ((p_filters->>'created_after') IS NULL OR l.criado_em >= (p_filters->>'created_after')::timestamptz)
    AND ((p_filters->>'created_before') IS NULL OR l.criado_em <= (p_filters->>'created_before')::timestamptz);

  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_whatsapp_audience_count(jsonb) TO authenticated;

-- RPC: popular leads da campanha WhatsApp
CREATE OR REPLACE FUNCTION public.populate_whatsapp_campaign_leads(p_campaign_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
  v_filters JSONB;
BEGIN
  SELECT audience_filters INTO v_filters FROM whatsapp_campaigns WHERE id = p_campaign_id;
  IF v_filters IS NULL THEN v_filters := '{}'::jsonb; END IF;

  DELETE FROM whatsapp_campaign_leads WHERE campaign_id = p_campaign_id AND status = 'pending';

  IF v_filters ? 'lead_ids' AND jsonb_array_length(v_filters->'lead_ids') > 0 THEN
    INSERT INTO whatsapp_campaign_leads (campaign_id, lead_id, phone, nome)
    SELECT p_campaign_id, l.id, l.telefone, l.nome FROM leads l
    WHERE l.id::text IN (SELECT jsonb_array_elements_text(v_filters->'lead_ids'))
      AND l.telefone IS NOT NULL AND l.telefone <> ''
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    UPDATE whatsapp_campaigns SET total_recipients = v_count, updated_at = now() WHERE id = p_campaign_id;
    RETURN v_count;
  END IF;

  INSERT INTO whatsapp_campaign_leads (campaign_id, lead_id, phone, nome)
  SELECT p_campaign_id, l.id, l.telefone, l.nome FROM leads l
  WHERE l.telefone IS NOT NULL AND l.telefone <> ''
    AND (v_filters->'statuses' IS NULL OR jsonb_array_length(v_filters->'statuses') = 0
         OR l.status IN (SELECT jsonb_array_elements_text(v_filters->'statuses')))
    AND (v_filters->'origens' IS NULL OR jsonb_array_length(v_filters->'origens') = 0
         OR l.origem IN (SELECT jsonb_array_elements_text(v_filters->'origens')))
    AND (v_filters->'tipos' IS NULL OR jsonb_array_length(v_filters->'tipos') = 0
         OR l.tipo_lead IN (SELECT jsonb_array_elements_text(v_filters->'tipos')))
    AND (v_filters->'tags_any' IS NULL OR jsonb_array_length(v_filters->'tags_any') = 0
         OR l.tags && ARRAY(SELECT jsonb_array_elements_text(v_filters->'tags_any')))
    AND ((v_filters->>'created_after') IS NULL OR l.criado_em >= (v_filters->>'created_after')::timestamptz)
    AND ((v_filters->>'created_before') IS NULL OR l.criado_em <= (v_filters->>'created_before')::timestamptz)
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  UPDATE whatsapp_campaigns SET total_recipients = v_count, updated_at = now() WHERE id = p_campaign_id;
  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.populate_whatsapp_campaign_leads(uuid) TO authenticated;

SELECT 'whatsapp campaigns ok' as result;
