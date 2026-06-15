# editar-negocio

Edge Function que a Rita chama pra atualizar campos de um negócio já cadastrado.

## Pipeline

```
agente -> tool `editar_negocio` -> edge function:
  1. busca negocio (estado "before")
  2. filtra patch contra whitelist (ALLOWED_FIELDS)
  3. valida + coage tipos por campo
  4. UPDATE só dos campos que mudaram de verdade
  5. opcional: grava agent_audit
  6. retorna { ok, before, after, changed_fields, ignored_fields }
```

## Campos editáveis (whitelist)

| Campo | Tipo | Validação |
|-------|------|-----------|
| `titulo` | string | não-vazio, ≤200 chars |
| `categoria` | string | uma das 10 do site |
| `cidade` | string | qualquer texto |
| `estado` | string | UF (2 chars, vira UPPERCASE) |
| `bairro` | string \| null | texto livre |
| `preco` | number | ≥ 0 |
| `faturamento_mensal` | number | ≥ 0 |
| `area_m2` | number | ≥ 0 |
| `descricao` | string | texto livre |
| `proprietario_nome` | string | texto livre |
| `proprietario_email` | string \| null | regex de email |
| `proprietario_telefone` | string \| null | 10-13 dígitos |
| `status` | enum | pendente/ativo/rejeitado/vendido/rascunho |
| `badge_texto` | string \| null | ex: "LOCAÇÃO", "PROMOÇÃO" |
| `badge_cor` | enum | green/blue/red/amber/violet/slate |
| `mostrar_preco_foto` | boolean | |
| `destaque` | boolean | |

**NÃO** editáveis via esta tool (intencionalmente):
- `id`, `criado_em` — imutáveis
- `corretor_id` — usar tool específica de atribuição (admin)
- `imagem`, `imagens` — usar `foto-inteligente`

Tudo fora dessa lista vai pra `ignored_fields` no retorno (sem erro, só ignorado).

## Input

```json
{
  "negocio_id": "uuid-do-negocio",
  "patch": {
    "preco": 350000,
    "descricao": "Atualizada com novas informações"
  },
  "reason": "Cliente pediu pra atualizar o preço por WhatsApp"
}
```

## Output

```json
{
  "ok": true,
  "before": { "id": "...", "preco": 380000, "descricao": "...", "...": "..." },
  "after":  { "id": "...", "preco": 350000, "descricao": "Atualizada ...", "...": "..." },
  "changed_fields": ["preco", "descricao"],
  "ignored_fields": []
}
```

Se nada mudou (mesmo valor):
```json
{ "ok": true, "before": {...}, "after": {...}, "changed_fields": [], "ignored_fields": [] }
```

Se validação falhou:
```json
{ "ok": false, "error": "Validação falhou: preco: preco deve ser número >= 0" }
```

## Deploy

```bash
supabase functions deploy editar-negocio --no-verify-jwt
```

## Tabela de auditoria (opcional)

A function tenta gravar em `agent_audit` se a tabela existir. SQL:

```sql
create table if not exists agent_audit (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  action text not null,
  target_id text,
  changes jsonb,
  reason text
);
```

Se não criar, a function continua funcionando — só não loga.

## Segurança

- **Whitelist explícita**: campos sensíveis (corretor_id, id) não passam.
- **Validação por campo**: tipo + range + enum antes do UPDATE.
- **Idempotente**: chamar 2× com mesmo patch não altera nada na 2ª chamada.
- Function não exige JWT (chamada server-side pelo agente).
