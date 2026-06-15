-- Registra a tool `editar_negocio` na Rita.
-- Rodar no SQL Editor do Supabase Studio (projeto ncqlkdbablgwthfaxgap).
--
-- Pré-requisito: Edge Function `editar-negocio` já deployada.

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
  'editar_negocio',
  'Atualiza UM negocio/imovel ja cadastrado. Use quando o usuario pedir pra mudar algo no cadastro (preco, descricao, status, contato, etc) E voce ja confirmou QUE negocio e (negocio_id). SEMPRE liste o que vai mudar e PEDIR CONFIRMACAO antes de chamar. Nao use pra mudar fotos (use foto_inteligente) nem corretor responsavel.',
  jsonb_build_object(
    'type', 'object',
    'required', jsonb_build_array('negocio_id','patch'),
    'properties', jsonb_build_object(
      'negocio_id', jsonb_build_object('type','string','description','UUID do negocio em `negocios`.'),
      'patch', jsonb_build_object(
        'type','object',
        'description','Objeto com APENAS os campos a mudar. Tudo fora da whitelist e ignorado.',
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
      'reason', jsonb_build_object('type','string','description','Motivo da edicao (vai pra log). Ex: "Cliente pediu pra baixar preco por WhatsApp".')
    )
  ),
  'edge_function',
  jsonb_build_object(
    'function_name', 'editar-negocio'
  ),
  'auto',
  true
FROM rita;

-- Sanity check
SELECT t.name, t.action_type, t.action_config, t.is_active
FROM agents_tools t
JOIN agents a ON a.id = t.agent_id
WHERE a.slug = 'rita' AND t.name = 'editar_negocio';
