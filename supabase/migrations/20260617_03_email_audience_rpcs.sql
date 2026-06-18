-- ============================================================
-- 03 — RPCs de audiência (adaptadas ao schema PT do projeto)
-- ============================================================
-- Filtros disponíveis (todos opcionais):
--   lead_ids:        ["uuid", ...]    → short-circuit (ignora demais)
--   corretor_ids:    ["uuid", ...]
--   statuses:        ["novo","em-andamento","convertido","perdido"]
--   origens:         ["contato-negocio","contato-galeria","anunciar","newsletter","exit-intent","whatsapp"]
--   tipos:           ["comprador","corretor", ...]
--   tags_any:        ["vip","newsletter", ...]   → match se lead tem QUALQUER tag
--   tags_all:        ["vip","quente"]            → match se lead tem TODAS
--   created_after:   "2026-01-01T00:00:00Z"
--   created_before:  "2026-12-31T23:59:59Z"
--   exclude_campaign_days: 7   → exclui leads que receberam email nos últimos N dias
--
-- Excluídos automaticamente:
--   - email NULL ou vazio
--   - email_opted_out = true
--   - presente em email_unsubscribes
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_email_audience_count(p_filters jsonb DEFAULT '{}'::jsonb)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  -- Modo "leads específicos": short-circuit
  IF p_filters ? 'lead_ids' AND jsonb_array_length(p_filters->'lead_ids') > 0 THEN
    SELECT count(*) INTO v_count
    FROM leads l
    WHERE l.id::text IN (SELECT jsonb_array_elements_text(p_filters->'lead_ids'))
      AND l.email IS NOT NULL
      AND l.email <> ''
      AND COALESCE(l.email_opted_out, false) = false
      AND NOT EXISTS (SELECT 1 FROM email_unsubscribes u WHERE u.email = l.email);
    RETURN v_count;
  END IF;

  SELECT count(*) INTO v_count
  FROM leads l
  WHERE l.email IS NOT NULL
    AND l.email <> ''
    AND COALESCE(l.email_opted_out, false) = false
    AND NOT EXISTS (SELECT 1 FROM email_unsubscribes u WHERE u.email = l.email)
    AND (
      p_filters->'corretor_ids' IS NULL
      OR jsonb_array_length(p_filters->'corretor_ids') = 0
      OR l.corretor_id::text IN (SELECT jsonb_array_elements_text(p_filters->'corretor_ids'))
    )
    AND (
      p_filters->'statuses' IS NULL
      OR jsonb_array_length(p_filters->'statuses') = 0
      OR l.status IN (SELECT jsonb_array_elements_text(p_filters->'statuses'))
    )
    AND (
      p_filters->'origens' IS NULL
      OR jsonb_array_length(p_filters->'origens') = 0
      OR l.origem IN (SELECT jsonb_array_elements_text(p_filters->'origens'))
    )
    AND (
      p_filters->'tipos' IS NULL
      OR jsonb_array_length(p_filters->'tipos') = 0
      OR l.tipo_lead IN (SELECT jsonb_array_elements_text(p_filters->'tipos'))
    )
    AND (
      p_filters->'tags_any' IS NULL
      OR jsonb_array_length(p_filters->'tags_any') = 0
      OR l.tags && ARRAY(SELECT jsonb_array_elements_text(p_filters->'tags_any'))
    )
    AND (
      p_filters->'tags_all' IS NULL
      OR jsonb_array_length(p_filters->'tags_all') = 0
      OR l.tags @> ARRAY(SELECT jsonb_array_elements_text(p_filters->'tags_all'))
    )
    AND (
      (p_filters->>'created_after') IS NULL
      OR l.criado_em >= (p_filters->>'created_after')::timestamptz
    )
    AND (
      (p_filters->>'created_before') IS NULL
      OR l.criado_em <= (p_filters->>'created_before')::timestamptz
    )
    AND (
      (p_filters->>'exclude_campaign_days') IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM email_campaign_leads ecl
        WHERE ecl.lead_id = l.id
          AND ecl.status IN ('sent','delivered','opened','clicked')
          AND ecl.sent_at > now() - ((p_filters->>'exclude_campaign_days')::int || ' days')::interval
      )
    );

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_audience_count(jsonb) TO authenticated;

-- ============================================================
-- populate_email_campaign_leads(p_campaign_id)
-- ============================================================

CREATE OR REPLACE FUNCTION public.populate_email_campaign_leads(p_campaign_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
  v_filters JSONB;
BEGIN
  SELECT audience_filters INTO v_filters
  FROM email_campaigns WHERE id = p_campaign_id;

  IF v_filters IS NULL THEN v_filters := '{}'::jsonb; END IF;

  -- Limpa pendentes anteriores (re-popular é seguro)
  DELETE FROM email_campaign_leads
  WHERE campaign_id = p_campaign_id AND status = 'pending';

  -- Modo "leads específicos"
  IF v_filters ? 'lead_ids' AND jsonb_array_length(v_filters->'lead_ids') > 0 THEN
    INSERT INTO email_campaign_leads (campaign_id, lead_id, email)
    SELECT p_campaign_id, l.id, l.email
    FROM leads l
    WHERE l.id::text IN (SELECT jsonb_array_elements_text(v_filters->'lead_ids'))
      AND l.email IS NOT NULL
      AND l.email <> ''
      AND COALESCE(l.email_opted_out, false) = false
      AND NOT EXISTS (SELECT 1 FROM email_unsubscribes u WHERE u.email = l.email)
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
  END IF;

  -- Modo filtro
  INSERT INTO email_campaign_leads (campaign_id, lead_id, email)
  SELECT p_campaign_id, l.id, l.email
  FROM leads l
  WHERE l.email IS NOT NULL
    AND l.email <> ''
    AND COALESCE(l.email_opted_out, false) = false
    AND NOT EXISTS (SELECT 1 FROM email_unsubscribes u WHERE u.email = l.email)
    AND (
      v_filters->'corretor_ids' IS NULL
      OR jsonb_array_length(v_filters->'corretor_ids') = 0
      OR l.corretor_id::text IN (SELECT jsonb_array_elements_text(v_filters->'corretor_ids'))
    )
    AND (
      v_filters->'statuses' IS NULL
      OR jsonb_array_length(v_filters->'statuses') = 0
      OR l.status IN (SELECT jsonb_array_elements_text(v_filters->'statuses'))
    )
    AND (
      v_filters->'origens' IS NULL
      OR jsonb_array_length(v_filters->'origens') = 0
      OR l.origem IN (SELECT jsonb_array_elements_text(v_filters->'origens'))
    )
    AND (
      v_filters->'tipos' IS NULL
      OR jsonb_array_length(v_filters->'tipos') = 0
      OR l.tipo_lead IN (SELECT jsonb_array_elements_text(v_filters->'tipos'))
    )
    AND (
      v_filters->'tags_any' IS NULL
      OR jsonb_array_length(v_filters->'tags_any') = 0
      OR l.tags && ARRAY(SELECT jsonb_array_elements_text(v_filters->'tags_any'))
    )
    AND (
      v_filters->'tags_all' IS NULL
      OR jsonb_array_length(v_filters->'tags_all') = 0
      OR l.tags @> ARRAY(SELECT jsonb_array_elements_text(v_filters->'tags_all'))
    )
    AND (
      (v_filters->>'created_after') IS NULL
      OR l.criado_em >= (v_filters->>'created_after')::timestamptz
    )
    AND (
      (v_filters->>'created_before') IS NULL
      OR l.criado_em <= (v_filters->>'created_before')::timestamptz
    )
    AND (
      (v_filters->>'exclude_campaign_days') IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM email_campaign_leads ecl
        WHERE ecl.lead_id = l.id
          AND ecl.status IN ('sent','delivered','opened','clicked')
          AND ecl.sent_at > now() - ((v_filters->>'exclude_campaign_days')::int || ' days')::interval
      )
    )
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Atualiza total_recipients na campanha
  UPDATE email_campaigns
  SET total_recipients = v_count, total_leads = v_count, updated_at = now()
  WHERE id = p_campaign_id;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.populate_email_campaign_leads(uuid) TO authenticated;

SELECT 'email audience RPCs ok' as result;
