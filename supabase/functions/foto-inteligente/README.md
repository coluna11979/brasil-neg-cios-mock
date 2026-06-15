# foto-inteligente

Edge Function que a Rita (e qualquer agente) chama pra anexar uma foto a um
negócio do site — aprimorada de forma **determinística e segura** (sem AI no
loop de pixel, zero risco de inventar conteúdo do imóvel).

## Pipeline

```
agente recebe foto no WhatsApp/chat
        ↓
agente chama tool `foto-inteligente`
        ↓
edge function:
  1. baixa foto (URL UAZAPI ou base64)
  2. brilho + contraste + saturação leves (preset interior/fachada/auto)
  3. resize máx 1920x1920 (mantém aspecto)
  4. encode JPEG q=88
  5. upload em `lead-images/negocios/{id}-{i}-{ts}.jpg`
  6. UPDATE negocios SET imagem = ..., imagens = imagens || ...
  7. retorna { ok, url, total_imagens }
```

## Input

```json
{
  "negocio_id": "uuid-do-negocio",
  "image_url": "https://uazapi.com/.../foto.jpg",  // OU
  "image_base64": "iVBORw0KGgo...",                // base64 puro, sem prefixo
  "make_capa": true,                               // default true
  "enhancement": "auto"                            // "auto" | "interior" | "fachada" | "off"
}
```

## Output

```json
{
  "ok": true,
  "url": "https://....supabase.co/storage/v1/.../negocios/abc-2-1736.jpg",
  "path": "negocios/abc-2-1736.jpg",
  "attached_to": "abc",
  "total_imagens": 3
}
```

## Deploy

```bash
# Login (uma vez)
supabase login

# Link com o projeto NegociaAky
supabase link --project-ref ncqlkdbablgwthfaxgap

# Deploy (sem JWT — agente chama com SERVICE_ROLE_KEY no header)
supabase functions deploy foto-inteligente --no-verify-jwt
```

OU pelo Studio: Edge Functions → New function → cola o `index.ts`.

## Segurança

- **Zero AI no pixel**: só pixel-math determinístico. Impossível inventar móvel,
  sumir com objeto ou mudar layout. A foto que sobe é a mesma foto, só polida.
- Function não exige JWT do usuário porque é chamada server-side pelo agente
  (que já passa pelo webhook autenticado). Use SERVICE_ROLE_KEY no header
  `Authorization` quando chamar de fora.
- Não há rate limit interno; confie no rate limit do agente.

## Limites conhecidos

- `imagescript` ainda não tem unsharp mask de boa qualidade. Se quiser
  nitidez agressiva, substituir por `photon-rs` (WASM, mais pesado).
- Para enhancement com AI realmente "inteligente" (corrigir perspectiva,
  remover poste estragando a foto, etc) seria preciso usar Gemini 2.5
  Flash Image — mas aí volta o risco de invenção. Mantido fora pela
  regra do produto: "melhoria honesta, photoshop enganoso não".
