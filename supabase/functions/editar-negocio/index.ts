// supabase/functions/editar-negocio/index.ts
//
// Tool chamada pela Rita (e qualquer agente) pra editar campos de um negócio
// já cadastrado. Whitelist explícita de campos editáveis — bloqueia edição
// de id/criado_em/corretor_id e dos arrays de imagem (use foto-inteligente
// pra fotos, atribuir-corretor pra corretor).
//
// Retorna { ok, before, after, changed_fields } — o agente pode usar pra
// confirmar pro usuário "ok, mudei X de A pra B".
//
// Deploy: supabase functions deploy editar-negocio --no-verify-jwt
//
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Whitelist do que pode ser editado via tool ────────────────────────────
// Tudo que não está aqui é IGNORADO no patch (não dá erro, só ignora).
// Pra editar fotos: use `foto-inteligente`.
// Pra atribuir corretor: use a tool específica do admin (segurança).
const ALLOWED_FIELDS = new Set([
  "titulo",
  "categoria",
  "cidade",
  "estado",
  "bairro",
  "preco",
  "faturamento_mensal",
  "area_m2",
  "descricao",
  "proprietario_nome",
  "proprietario_email",
  "proprietario_telefone",
  "status",
  "badge_texto",
  "badge_cor",
  "mostrar_preco_foto",
  "destaque",
]);

const VALID_STATUS = new Set(["pendente", "ativo", "rejeitado", "vendido", "rascunho"]);
const VALID_BADGE_COR = new Set(["green", "blue", "red", "amber", "violet", "slate"]);
const VALID_CATEGORIAS = new Set([
  "Alimentação", "Saúde e Estética", "Serviços", "Varejo", "Tecnologia",
  "Educação", "Automotivo", "Indústria", "Imóveis Comerciais", "Outro",
]);

interface EditarInput {
  negocio_id: string;                     // UUID do negócio
  patch: Record<string, any>;             // campos a atualizar (será filtrado)
  reason?: string;                        // motivo (vai pro log)
}

interface EditarOutput {
  ok: boolean;
  before?: Record<string, any>;
  after?: Record<string, any>;
  changed_fields?: string[];
  ignored_fields?: string[];
  error?: string;
}

// ─── Validações por campo ───────────────────────────────────────────────────
function validateField(key: string, value: any): { ok: boolean; error?: string; coerced?: any } {
  if (value === null) return { ok: true, coerced: null }; // nullable OK

  switch (key) {
    case "titulo":
      if (typeof value !== "string" || !value.trim()) return { ok: false, error: "titulo deve ser string não-vazia" };
      if (value.length > 200) return { ok: false, error: "titulo > 200 chars" };
      return { ok: true, coerced: value.trim() };

    case "categoria":
      if (!VALID_CATEGORIAS.has(value)) return { ok: false, error: `categoria inválida. Use: ${[...VALID_CATEGORIAS].join(", ")}` };
      return { ok: true, coerced: value };

    case "cidade":
    case "bairro":
    case "descricao":
    case "proprietario_nome":
    case "badge_texto":
      if (typeof value !== "string") return { ok: false, error: `${key} deve ser string` };
      return { ok: true, coerced: value.trim() || null };

    case "estado":
      if (typeof value !== "string" || value.length !== 2) return { ok: false, error: "estado deve ser UF (2 chars)" };
      return { ok: true, coerced: value.toUpperCase() };

    case "preco":
    case "faturamento_mensal":
    case "area_m2": {
      const n = Number(value);
      if (!isFinite(n) || n < 0) return { ok: false, error: `${key} deve ser número >= 0` };
      return { ok: true, coerced: n };
    }

    case "proprietario_email": {
      if (typeof value !== "string") return { ok: false, error: "email deve ser string" };
      const v = value.trim();
      if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return { ok: false, error: "email inválido" };
      return { ok: true, coerced: v || null };
    }

    case "proprietario_telefone": {
      if (typeof value !== "string") return { ok: false, error: "telefone deve ser string" };
      const digits = value.replace(/\D/g, "");
      if (digits && (digits.length < 10 || digits.length > 13)) return { ok: false, error: "telefone deve ter 10-13 dígitos" };
      return { ok: true, coerced: digits || null };
    }

    case "status":
      if (!VALID_STATUS.has(value)) return { ok: false, error: `status inválido. Use: ${[...VALID_STATUS].join(", ")}` };
      return { ok: true, coerced: value };

    case "badge_cor":
      if (!VALID_BADGE_COR.has(value)) return { ok: false, error: `badge_cor inválida. Use: ${[...VALID_BADGE_COR].join(", ")}` };
      return { ok: true, coerced: value };

    case "mostrar_preco_foto":
    case "destaque":
      return { ok: true, coerced: !!value };

    default:
      return { ok: false, error: `campo ${key} não suportado` };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const input = await req.json() as EditarInput;
    if (!input.negocio_id) throw new Error("missing negocio_id");
    if (!input.patch || typeof input.patch !== "object") throw new Error("missing patch (object)");

    // 1. Estado atual (before)
    const { data: before, error: getErr } = await supabase
      .from("negocios")
      .select("*")
      .eq("id", input.negocio_id)
      .single();
    if (getErr || !before) throw new Error(`negocio ${input.negocio_id} não encontrado`);

    // 2. Filtra patch: whitelist + valida + coage tipos
    const cleanPatch: Record<string, any> = {};
    const changed: string[] = [];
    const ignored: string[] = [];
    const errors: string[] = [];

    for (const [key, raw] of Object.entries(input.patch)) {
      if (!ALLOWED_FIELDS.has(key)) {
        ignored.push(key);
        continue;
      }
      const v = validateField(key, raw);
      if (!v.ok) {
        errors.push(`${key}: ${v.error}`);
        continue;
      }
      // Só conta como changed se o valor mudou de verdade
      if (before[key] !== v.coerced) {
        cleanPatch[key] = v.coerced;
        changed.push(key);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validação falhou: ${errors.join("; ")}`);
    }

    if (changed.length === 0) {
      // Idempotente: nada pra mudar
      const out: EditarOutput = {
        ok: true,
        before,
        after: before,
        changed_fields: [],
        ignored_fields: ignored,
      };
      return new Response(JSON.stringify(out), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. UPDATE
    const { data: after, error: updErr } = await supabase
      .from("negocios")
      .update(cleanPatch)
      .eq("id", input.negocio_id)
      .select("*")
      .single();
    if (updErr) throw new Error(`update falhou: ${updErr.message}`);

    // 4. Log de auditoria (opcional — se tiver tabela agent_audit, escreve;
    //    senão ignora silencioso)
    try {
      await supabase.from("agent_audit").insert({
        action: "editar_negocio",
        target_id: input.negocio_id,
        changes: cleanPatch,
        reason: input.reason || null,
      });
    } catch (_) { /* tabela pode não existir, ok */ }

    const out: EditarOutput = {
      ok: true,
      before,
      after,
      changed_fields: changed,
      ignored_fields: ignored,
    };
    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    const out: EditarOutput = { ok: false, error: String(e?.message ?? e) };
    return new Response(JSON.stringify(out), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
