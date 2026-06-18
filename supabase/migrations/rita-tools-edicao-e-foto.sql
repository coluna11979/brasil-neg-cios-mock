-- ════════════════════════════════════════════════════════════════════════════
-- Rita Cadastros — adiciona 2 tools: editar_negocio + anexar_foto_negocio
-- ════════════════════════════════════════════════════════════════════════════
-- Como rodar:
--   1. Abre o SQL Editor do Supabase Studio do projeto NegociaAky (ncqlkdbablgwthfaxgap)
--   2. Cola este arquivo inteiro
--   3. Run
--   4. Volta pra Rita no playground e testa: "edita a descrição do imóvel X"
--      ou manda uma foto: "anexa essa foto no imóvel X"
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Função: editar_negocio ─────────────────────────────────────────────
-- Recebe negocio_id + patch (jsonb com campos a alterar) + reason (motivo).
-- Whitelist explícita: só campos listados podem ser editados.
-- Devolve { ok, changed_fields[], ignored_fields[], before, after }.

CREATE OR REPLACE FUNCTION public.agent_editar_negocio(
  p_negocio_id uuid,
  p_patch jsonb,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed text[] := ARRAY[
    'titulo','categoria','cidade','estado','bairro','preco',
    'faturamento_mensal','area_m2','descricao','proprietario_nome',
    'proprietario_email','proprietario_telefone','status','badge_texto',
    'badge_cor','mostrar_preco_foto','destaque'
  ];
  v_valid_status text[] := ARRAY['pendente','ativo','rejeitado','vendido','rascunho'];
  v_valid_badge_cor text[] := ARRAY['green','blue','red','amber','violet','slate'];
  v_valid_categorias text[] := ARRAY[
    'Alimentação','Saúde e Estética','Serviços','Varejo','Tecnologia',
    'Educação','Automotivo','Indústria','Imóveis Comerciais','Outro'
  ];
  v_before jsonb;
  v_clean_patch jsonb := '{}'::jsonb;
  v_changed text[] := ARRAY[]::text[];
  v_ignored text[] := ARRAY[]::text[];
  v_errors text[] := ARRAY[]::text[];
  v_key text;
  v_raw jsonb;
  v_value jsonb;
  v_after jsonb;
BEGIN
  -- Carrega estado atual
  SELECT to_jsonb(n) INTO v_before
  FROM public.negocios n
  WHERE n.id = p_negocio_id;

  IF v_before IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', format('negocio %s não encontrado', p_negocio_id)
    );
  END IF;

  -- Itera nas chaves do patch
  FOR v_key, v_raw IN SELECT * FROM jsonb_each(p_patch)
  LOOP
    -- Whitelist
    IF NOT (v_key = ANY (v_allowed)) THEN
      v_ignored := array_append(v_ignored, v_key);
      CONTINUE;
    END IF;

    -- Coerção + validação por campo
    BEGIN
      CASE v_key
        WHEN 'titulo' THEN
          IF v_raw IS NULL OR jsonb_typeof(v_raw) != 'string' OR trim(v_raw #>> '{}') = '' THEN
            v_errors := array_append(v_errors, 'titulo deve ser string não-vazia');
            CONTINUE;
          END IF;
          v_value := to_jsonb(trim(v_raw #>> '{}'));

        WHEN 'categoria' THEN
          IF NOT ((v_raw #>> '{}') = ANY (v_valid_categorias)) THEN
            v_errors := array_append(v_errors, format('categoria inválida: %s', v_raw #>> '{}'));
            CONTINUE;
          END IF;
          v_value := v_raw;

        WHEN 'estado' THEN
          IF length(v_raw #>> '{}') != 2 THEN
            v_errors := array_append(v_errors, 'estado deve ter 2 letras');
            CONTINUE;
          END IF;
          v_value := to_jsonb(upper(v_raw #>> '{}'));

        WHEN 'cidade','bairro','descricao','proprietario_nome','badge_texto' THEN
          IF v_raw = 'null'::jsonb OR v_raw IS NULL THEN
            v_value := 'null'::jsonb;
          ELSE
            IF jsonb_typeof(v_raw) != 'string' THEN
              v_errors := array_append(v_errors, format('%s deve ser string', v_key));
              CONTINUE;
            END IF;
            -- String vazia vira null pra campos nullable
            IF trim(v_raw #>> '{}') = '' THEN
              v_value := 'null'::jsonb;
            ELSE
              v_value := to_jsonb(trim(v_raw #>> '{}'));
            END IF;
          END IF;

        WHEN 'preco','faturamento_mensal','area_m2' THEN
          IF v_raw = 'null'::jsonb THEN
            v_value := 'null'::jsonb;
          ELSE
            IF NOT (jsonb_typeof(v_raw) IN ('number','string')) THEN
              v_errors := array_append(v_errors, format('%s deve ser número', v_key));
              CONTINUE;
            END IF;
            DECLARE n numeric := (v_raw #>> '{}')::numeric;
            BEGIN
              IF n < 0 THEN
                v_errors := array_append(v_errors, format('%s deve ser >= 0', v_key));
                CONTINUE;
              END IF;
              v_value := to_jsonb(n);
            END;
          END IF;

        WHEN 'proprietario_email' THEN
          IF v_raw = 'null'::jsonb OR trim(coalesce(v_raw #>> '{}','')) = '' THEN
            v_value := 'null'::jsonb;
          ELSE
            IF (v_raw #>> '{}') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
              v_errors := array_append(v_errors, 'email inválido');
              CONTINUE;
            END IF;
            v_value := to_jsonb(trim(v_raw #>> '{}'));
          END IF;

        WHEN 'proprietario_telefone' THEN
          IF v_raw = 'null'::jsonb OR trim(coalesce(v_raw #>> '{}','')) = '' THEN
            v_value := 'null'::jsonb;
          ELSE
            DECLARE digits text := regexp_replace(v_raw #>> '{}', '\D', '', 'g');
            BEGIN
              IF length(digits) < 10 OR length(digits) > 13 THEN
                v_errors := array_append(v_errors, 'telefone deve ter 10-13 dígitos');
                CONTINUE;
              END IF;
              v_value := to_jsonb(digits);
            END;
          END IF;

        WHEN 'status' THEN
          IF NOT ((v_raw #>> '{}') = ANY (v_valid_status)) THEN
            v_errors := array_append(v_errors, format('status inválido: %s', v_raw #>> '{}'));
            CONTINUE;
          END IF;
          v_value := v_raw;

        WHEN 'badge_cor' THEN
          IF NOT ((v_raw #>> '{}') = ANY (v_valid_badge_cor)) THEN
            v_errors := array_append(v_errors, format('badge_cor inválida: %s', v_raw #>> '{}'));
            CONTINUE;
          END IF;
          v_value := v_raw;

        WHEN 'mostrar_preco_foto','destaque' THEN
          IF jsonb_typeof(v_raw) NOT IN ('boolean','string') THEN
            v_errors := array_append(v_errors, format('%s deve ser boolean', v_key));
            CONTINUE;
          END IF;
          v_value := to_jsonb(
            CASE
              WHEN jsonb_typeof(v_raw) = 'boolean' THEN (v_raw)::text::boolean
              ELSE (v_raw #>> '{}')::boolean
            END
          );

        ELSE
          v_ignored := array_append(v_ignored, v_key);
          CONTINUE;
      END CASE;

      -- Só conta como changed se mudou de verdade
      IF v_before -> v_key IS DISTINCT FROM v_value THEN
        v_clean_patch := v_clean_patch || jsonb_build_object(v_key, v_value);
        v_changed := array_append(v_changed, v_key);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, format('%s: %s', v_key, SQLERRM));
    END;
  END LOOP;

  IF array_length(v_errors, 1) > 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Validação falhou: ' || array_to_string(v_errors, '; ')
    );
  END IF;

  IF array_length(v_changed, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'changed_fields', '[]'::jsonb,
      'ignored_fields', to_jsonb(v_ignored),
      'before', v_before,
      'after', v_before,
      'message', 'Valores já estavam como solicitado.'
    );
  END IF;

  -- UPDATE
  UPDATE public.negocios
  SET
    titulo                = COALESCE((v_clean_patch->>'titulo')::text, titulo),
    categoria             = COALESCE((v_clean_patch->>'categoria')::text, categoria),
    cidade                = COALESCE((v_clean_patch->>'cidade')::text, cidade),
    estado                = COALESCE((v_clean_patch->>'estado')::text, estado),
    bairro                = CASE WHEN v_clean_patch ? 'bairro' THEN (v_clean_patch->>'bairro') ELSE bairro END,
    preco                 = CASE WHEN v_clean_patch ? 'preco' THEN NULLIF(v_clean_patch->>'preco','null')::numeric ELSE preco END,
    faturamento_mensal    = CASE WHEN v_clean_patch ? 'faturamento_mensal' THEN NULLIF(v_clean_patch->>'faturamento_mensal','null')::numeric ELSE faturamento_mensal END,
    area_m2               = CASE WHEN v_clean_patch ? 'area_m2' THEN NULLIF(v_clean_patch->>'area_m2','null')::numeric ELSE area_m2 END,
    descricao             = CASE WHEN v_clean_patch ? 'descricao' THEN (v_clean_patch->>'descricao') ELSE descricao END,
    proprietario_nome     = COALESCE((v_clean_patch->>'proprietario_nome')::text, proprietario_nome),
    proprietario_email    = CASE WHEN v_clean_patch ? 'proprietario_email' THEN (v_clean_patch->>'proprietario_email') ELSE proprietario_email END,
    proprietario_telefone = CASE WHEN v_clean_patch ? 'proprietario_telefone' THEN (v_clean_patch->>'proprietario_telefone') ELSE proprietario_telefone END,
    status                = COALESCE((v_clean_patch->>'status')::text, status),
    badge_texto           = CASE WHEN v_clean_patch ? 'badge_texto' THEN (v_clean_patch->>'badge_texto') ELSE badge_texto END,
    badge_cor             = COALESCE((v_clean_patch->>'badge_cor')::text, badge_cor),
    mostrar_preco_foto    = COALESCE((v_clean_patch->>'mostrar_preco_foto')::boolean, mostrar_preco_foto),
    destaque              = COALESCE((v_clean_patch->>'destaque')::boolean, destaque)
  WHERE id = p_negocio_id
  RETURNING to_jsonb(negocios.*) INTO v_after;

  -- Audit log opcional (se a tabela existir)
  BEGIN
    INSERT INTO public.agent_audit (action, target_id, changes, reason)
    VALUES ('editar_negocio', p_negocio_id::text, v_clean_patch, p_reason);
  EXCEPTION WHEN undefined_table THEN
    NULL; -- tabela não existe, ok
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'changed_fields', to_jsonb(v_changed),
    'ignored_fields', to_jsonb(v_ignored),
    'before', v_before,
    'after', v_after
  );
END;
$$;


-- ─── 2. Função: anexar_foto_negocio ────────────────────────────────────────
-- Recebe negocio_id + image_url (foto já hospedada no Supabase Storage ou
-- qualquer URL pública) + make_capa.
--
-- NÃO faz processamento de pixel (brilho/contraste) — Postgres não baixa URL
-- nem manipula imagem. Pra essa etapa, futuramente faremos Edge Function.
-- Por agora: o agente só ANEXA a URL ao array `imagens`, e opcionalmente
-- promove a capa.

CREATE OR REPLACE FUNCTION public.agent_anexar_foto_negocio(
  p_negocio_id uuid,
  p_image_url text,
  p_make_capa boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existentes text[];
  v_novas text[];
  v_capa text;
  v_after jsonb;
BEGIN
  IF p_image_url IS NULL OR trim(p_image_url) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'image_url vazia');
  END IF;

  IF NOT (p_image_url ~* '^https?://') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'image_url deve começar com http:// ou https://');
  END IF;

  SELECT
    COALESCE(imagens, ARRAY[]::text[]),
    imagem
  INTO v_existentes, v_capa
  FROM public.negocios
  WHERE id = p_negocio_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', format('negocio %s não encontrado', p_negocio_id));
  END IF;

  -- Já tem essa URL?
  IF p_image_url = ANY (v_existentes) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'url', p_image_url,
      'attached_to', p_negocio_id,
      'total_imagens', array_length(v_existentes, 1),
      'message', 'Foto já estava anexada (sem duplicar).'
    );
  END IF;

  v_novas := v_existentes || p_image_url;

  -- Capa: se não tem capa ainda, esta vira capa; senão respeita make_capa
  IF v_capa IS NULL OR v_capa = '' THEN
    v_capa := p_image_url;
  ELSIF p_make_capa = false THEN
    -- mantém a capa atual
    NULL;
  END IF;
  -- (Por design: make_capa=true NÃO troca capa existente — pra evitar
  --  troca acidental. Use editar_negocio se quiser forçar troca de capa.)

  UPDATE public.negocios
  SET imagem = v_capa, imagens = v_novas
  WHERE id = p_negocio_id
  RETURNING to_jsonb(negocios.*) INTO v_after;

  RETURN jsonb_build_object(
    'ok', true,
    'url', p_image_url,
    'attached_to', p_negocio_id,
    'total_imagens', array_length(v_novas, 1),
    'after', v_after
  );
END;
$$;


-- ─── 3. Registra as duas tools na Rita ─────────────────────────────────────
-- A Rita é o agente com slug 'cadastrador' (visto no URL /agentes/cadastrador/playground)

WITH rita AS (
  SELECT id FROM public.agents_registry WHERE slug = 'cadastrador' LIMIT 1
)
-- Tool 1: editar_negocio
INSERT INTO public.agents_tools (
  agent_id, name, description, parameters_schema, action_type, action_config, usage_mode, is_active
)
SELECT
  rita.id,
  'editar_negocio',
  'Atualiza UM negocio/imovel JA cadastrado. Use quando o usuario pedir pra alterar algo no anuncio existente (preço, descrição, status, contato, bairro, badge, etc) E voce ja confirmou QUE negocio e (negocio_id). SEMPRE liste em portugues simples o que vai mudar e PEDIR CONFIRMACAO antes de chamar. Para fotos use anexar_foto_negocio, nao essa.',
  jsonb_build_object(
    'type','object',
    'required', jsonb_build_array('negocio_id','patch'),
    'properties', jsonb_build_object(
      'negocio_id', jsonb_build_object('type','string','description','UUID do negocio em public.negocios.'),
      'patch', jsonb_build_object(
        'type','object',
        'description','Objeto com APENAS os campos a mudar. Campos fora da whitelist sao ignorados sem erro.',
        'properties', jsonb_build_object(
          'titulo',                 jsonb_build_object('type','string'),
          'categoria',              jsonb_build_object('type','string','enum', jsonb_build_array('Alimentação','Saúde e Estética','Serviços','Varejo','Tecnologia','Educação','Automotivo','Indústria','Imóveis Comerciais','Outro')),
          'cidade',                 jsonb_build_object('type','string'),
          'estado',                 jsonb_build_object('type','string','description','UF, 2 chars'),
          'bairro',                 jsonb_build_object('type', jsonb_build_array('string','null')),
          'preco',                  jsonb_build_object('type','number','minimum', 0),
          'faturamento_mensal',     jsonb_build_object('type','number','minimum', 0),
          'area_m2',                jsonb_build_object('type','number','minimum', 0),
          'descricao',              jsonb_build_object('type','string'),
          'proprietario_nome',      jsonb_build_object('type','string'),
          'proprietario_email',     jsonb_build_object('type', jsonb_build_array('string','null')),
          'proprietario_telefone',  jsonb_build_object('type', jsonb_build_array('string','null')),
          'status',                 jsonb_build_object('type','string','enum', jsonb_build_array('pendente','ativo','rejeitado','vendido','rascunho')),
          'badge_texto',            jsonb_build_object('type', jsonb_build_array('string','null'), 'description','Selo na foto, ex: LOCAÇÃO, PROMOÇÃO'),
          'badge_cor',              jsonb_build_object('type','string','enum', jsonb_build_array('green','blue','red','amber','violet','slate')),
          'mostrar_preco_foto',     jsonb_build_object('type','boolean'),
          'destaque',               jsonb_build_object('type','boolean')
        )
      ),
      'reason', jsonb_build_object('type','string','description','Motivo da edicao em 1 frase (vai pra log).')
    )
  ),
  'sql',
  jsonb_build_object(
    'function', 'agent_editar_negocio',
    'params_map', jsonb_build_object(
      'p_negocio_id', '{{negocio_id}}',
      'p_patch',      '{{patch}}',
      'p_reason',     '{{reason}}'
    )
  ),
  'auto',
  true
FROM rita
ON CONFLICT DO NOTHING;

-- Tool 2: anexar_foto_negocio
WITH rita AS (
  SELECT id FROM public.agents_registry WHERE slug = 'cadastrador' LIMIT 1
)
INSERT INTO public.agents_tools (
  agent_id, name, description, parameters_schema, action_type, action_config, usage_mode, is_active
)
SELECT
  rita.id,
  'anexar_foto_negocio',
  'Anexa UMA foto ja hospedada (URL publica) ao negocio/imovel. A foto vai pro array imagens; se o negocio nao tiver capa ainda, esta vira a capa. NAO duplica se a URL ja estiver anexada. Use quando o usuario mandar foto e voce ja salvou em algum lugar publico (Supabase Storage ou similar) e tem a URL final.',
  jsonb_build_object(
    'type','object',
    'required', jsonb_build_array('negocio_id','image_url'),
    'properties', jsonb_build_object(
      'negocio_id', jsonb_build_object('type','string','description','UUID do negocio.'),
      'image_url',  jsonb_build_object('type','string','description','URL publica completa da imagem (https://...).'),
      'make_capa',  jsonb_build_object('type','boolean','default', true,'description','Se nao houver capa ainda, esta vira capa. Default true.')
    )
  ),
  'sql',
  jsonb_build_object(
    'function', 'agent_anexar_foto_negocio',
    'params_map', jsonb_build_object(
      'p_negocio_id', '{{negocio_id}}',
      'p_image_url',  '{{image_url}}',
      'p_make_capa',  '{{make_capa}}'
    )
  ),
  'auto',
  true
FROM rita
ON CONFLICT DO NOTHING;


-- ─── 4. Tabela de auditoria (opcional) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  action text NOT NULL,
  target_id text,
  changes jsonb,
  reason text
);


-- ─── 5. Sanity checks ──────────────────────────────────────────────────────
SELECT
  t.name AS tool,
  t.action_type,
  t.action_config->>'function' AS sql_function,
  t.is_active
FROM public.agents_tools t
JOIN public.agents_registry a ON a.id = t.agent_id
WHERE a.slug = 'cadastrador'
ORDER BY t.name;

COMMIT;

-- ════════════════════════════════════════════════════════════════════════════
-- DEPOIS DESTE SQL — atualize o system prompt da Rita
-- ════════════════════════════════════════════════════════════════════════════
-- Cola este trecho no system prompt dela (Tab Regras), na seção de ferramentas:
--
--   • editar_negocio(negocio_id, patch, reason?)
--     Use quando o usuario pedir pra mudar campo de um anuncio existente.
--     SEMPRE confirme o diff antes de chamar:
--       "Quer que eu mude o PREÇO de R$ 380.000 pra R$ 350.000?"
--     Depois do "sim" claro, chame com patch={preco:350000} e reason curto.
--
--   • anexar_foto_negocio(negocio_id, image_url, make_capa?)
--     Use quando o usuario mandar foto no chat E voce tiver salvo num
--     bucket publico com URL pronta. NAO use pra foto ainda nao salva.
--     Antes de chamar, confirme: "Anexar essa foto ao [titulo do imovel]?"
--
-- ════════════════════════════════════════════════════════════════════════════
