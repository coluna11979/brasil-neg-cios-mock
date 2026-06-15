-- Registra a tool `foto_inteligente` na Rita.
-- Rodar no SQL Editor do Supabase Studio (projeto ncqlkdbablgwthfaxgap).
--
-- Pré-requisito: Edge Function `foto-inteligente` já deployada.
-- Pós: a Rita já pode chamar a tool no próximo turno de conversa.

-- 1. Acha o id da Rita (ajuste se ela tiver outro slug)
WITH rita AS (
  SELECT id FROM agents WHERE slug = 'rita' LIMIT 1
)
INSERT INTO agents_tools (
  agent_id,
  name,
  description,
  parameters_schema,
  action_type,
  action_config,
  usage_mode,
  is_active
)
SELECT
  rita.id,
  'foto_inteligente',
  'Aprimora UMA foto (luz/contraste/nitidez de forma realista, sem inventar conteúdo) e ANEXA ao negócio/imóvel. Use quando o usuário enviar foto de imóvel no WhatsApp ou chat e o negocio_id ja estiver identificado. NUNCA use pra fotos genéricas ou que não sejam do imóvel em questão.',
  jsonb_build_object(
    'type', 'object',
    'required', jsonb_build_array('negocio_id'),
    'properties', jsonb_build_object(
      'negocio_id', jsonb_build_object('type','string','description','UUID do negócio na tabela negocios.'),
      'image_url',  jsonb_build_object('type','string','description','URL da foto (ex: link do UAZAPI). Use isso quando tiver URL.'),
      'image_base64', jsonb_build_object('type','string','description','Base64 puro da foto (sem prefixo data:). Use quando NÃO tiver URL.'),
      'make_capa',  jsonb_build_object('type','boolean','description','Se true e o negócio ainda não tem capa, esta vira capa. Default true.','default', true),
      'enhancement', jsonb_build_object(
        'type','string',
        'enum', jsonb_build_array('auto','interior','fachada','off'),
        'description','Perfil de aprimoramento. Use "interior" pra fotos internas, "fachada" pra fotos externas/rua, "auto" se em dúvida, "off" pra subir crua.',
        'default','auto'
      )
    )
  ),
  'edge_function',
  jsonb_build_object(
    'function_name', 'foto-inteligente'
  ),
  -- usage_mode: ajuste pro padrão das outras tools da Rita (provavelmente
  -- 'auto' ou 'always_consider'). Vou deixar como string genérica;
  -- corrija pra valor exato do enum UsageMode do seu projeto.
  'auto',
  true
FROM rita;

-- 2. Sanity check
SELECT t.name, t.action_type, t.action_config, t.is_active
FROM agents_tools t
JOIN agents a ON a.id = t.agent_id
WHERE a.slug = 'rita' AND t.name = 'foto_inteligente';
