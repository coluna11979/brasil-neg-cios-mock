#!/usr/bin/env node
// test.mjs — testa a lógica de `editar-negocio` LOCALMENTE, batendo no banco
// de produção (com SERVICE_ROLE_KEY). Não precisa Docker, Supabase CLI nem
// deploy de Edge Function.
//
// Como rodar (Node 20+):
//   node --env-file=.env test.mjs list
//   node --env-file=.env test.mjs get <negocio_id>
//   node --env-file=.env test.mjs edit <negocio_id> campo=valor [campo=valor...]
//
// Requisitos no .env do projeto:
//   VITE_SUPABASE_URL=https://....supabase.co
//   VITE_SUPABASE_SERVICE_ROLE_KEY=<service_role_secret>   <-- ADICIONAR
//
// (Pega em Supabase Dashboard -> Project Settings -> API -> service_role secret)
//
// Exemplos:
//   node --env-file=.env test.mjs list
//   node --env-file=.env test.mjs edit abc-uuid badge_texto=TESTE
//   node --env-file=.env test.mjs edit abc-uuid preco=350000 status=ativo
//   node --env-file=.env test.mjs edit abc-uuid badge_texto=  (string vazia limpa)
//
// CADA edit salva backup em ./_backups/<id>-<ts>.json e mostra como reverter.

import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(`❌ Faltam credenciais no .env:
  VITE_SUPABASE_URL=${SUPABASE_URL ? "OK" : "FALTA"}
  VITE_SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY ? "OK" : "FALTA"}

Pega o service_role secret em:
  https://supabase.com/dashboard/project/ncqlkdbablgwthfaxgap/settings/api
  (campo "service_role" — copia o JWT inteiro)
`);
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── replicação da whitelist + validação do index.ts ─────────────────────────
const ALLOWED_FIELDS = new Set([
  "titulo","categoria","cidade","estado","bairro","preco","faturamento_mensal",
  "area_m2","descricao","proprietario_nome","proprietario_email",
  "proprietario_telefone","status","badge_texto","badge_cor",
  "mostrar_preco_foto","destaque",
]);
const VALID_STATUS = new Set(["pendente","ativo","rejeitado","vendido","rascunho"]);
const VALID_BADGE_COR = new Set(["green","blue","red","amber","violet","slate"]);
const VALID_CATEGORIAS = new Set([
  "Alimentação","Saúde e Estética","Serviços","Varejo","Tecnologia",
  "Educação","Automotivo","Indústria","Imóveis Comerciais","Outro",
]);

function validateField(key, value) {
  if (value === null) return { ok: true, coerced: null };
  switch (key) {
    case "titulo":
      if (typeof value !== "string" || !value.trim()) return { ok: false, error: "titulo deve ser string não-vazia" };
      if (value.length > 200) return { ok: false, error: "titulo > 200 chars" };
      return { ok: true, coerced: value.trim() };
    case "categoria":
      if (!VALID_CATEGORIAS.has(value)) return { ok: false, error: `categoria inválida` };
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
      if (!VALID_STATUS.has(value)) return { ok: false, error: `status inválido` };
      return { ok: true, coerced: value };
    case "badge_cor":
      if (!VALID_BADGE_COR.has(value)) return { ok: false, error: `badge_cor inválida` };
      return { ok: true, coerced: value };
    case "mostrar_preco_foto":
    case "destaque":
      return { ok: true, coerced: value === "true" || value === true };
    default:
      return { ok: false, error: `campo ${key} não suportado` };
  }
}

// ─── comandos ────────────────────────────────────────────────────────────────
async function cmdList() {
  const { data, error } = await sb
    .from("negocios")
    .select("id, titulo, categoria, cidade, estado, preco, status, criado_em")
    .order("criado_em", { ascending: false })
    .limit(15);
  if (error) { console.error("Erro:", error.message); process.exit(1); }
  if (!data?.length) { console.log("Nenhum negócio encontrado."); return; }
  console.log(`\n📋 Últimos ${data.length} negócios:\n`);
  for (const n of data) {
    const preco = n.preco ? `R$ ${Number(n.preco).toLocaleString("pt-BR")}` : "—";
    console.log(`  ${n.id}`);
    console.log(`    ${n.titulo}`);
    console.log(`    ${n.categoria} · ${n.cidade}/${n.estado} · ${preco} · ${n.status}\n`);
  }
}

async function cmdGet(id) {
  const { data, error } = await sb.from("negocios").select("*").eq("id", id).single();
  if (error || !data) { console.error("Erro:", error?.message || "não encontrado"); process.exit(1); }
  console.log("\n📦 Negócio completo:\n");
  console.log(JSON.stringify(data, null, 2));
}

async function cmdEdit(id, patchArgs) {
  // 1. parse args do tipo campo=valor
  const patch = {};
  for (const arg of patchArgs) {
    const eq = arg.indexOf("=");
    if (eq < 0) { console.error(`Arg inválido: ${arg} (esperado campo=valor)`); process.exit(1); }
    const key = arg.slice(0, eq);
    const raw = arg.slice(eq + 1);
    patch[key] = raw === "" ? null : raw; // string vazia vira null
  }

  // 2. busca estado atual
  const { data: before, error: getErr } = await sb.from("negocios").select("*").eq("id", id).single();
  if (getErr || !before) { console.error("Erro:", getErr?.message || "não encontrado"); process.exit(1); }

  // 3. valida + filtra
  const cleanPatch = {};
  const changed = [];
  const ignored = [];
  const errors = [];
  for (const [key, raw] of Object.entries(patch)) {
    if (!ALLOWED_FIELDS.has(key)) { ignored.push(key); continue; }
    const v = validateField(key, raw);
    if (!v.ok) { errors.push(`${key}: ${v.error}`); continue; }
    if (before[key] !== v.coerced) {
      cleanPatch[key] = v.coerced;
      changed.push(key);
    }
  }

  if (errors.length) {
    console.error("\n❌ Erros de validação:");
    errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log("\n📝 Plano de edição:");
  console.log(`  ID: ${id}`);
  console.log(`  Título: "${before.titulo}"`);
  if (ignored.length) console.log(`  Ignorados (fora da whitelist): ${ignored.join(", ")}`);
  if (!changed.length) {
    console.log("\n  ⚪ Nada a mudar — valores já estão como pedido.");
    return;
  }
  console.log("\n  Vai mudar:");
  changed.forEach(k => {
    const a = JSON.stringify(before[k]);
    const b = JSON.stringify(cleanPatch[k]);
    console.log(`    ${k}: ${a}  →  ${b}`);
  });

  // 4. backup
  const ts = Date.now();
  const backupDir = join(__dirname, "_backups");
  await mkdir(backupDir, { recursive: true });
  const backupPath = join(backupDir, `${id}-${ts}.json`);
  await writeFile(backupPath, JSON.stringify(before, null, 2));
  console.log(`\n  💾 Backup: ${backupPath}`);

  // 5. confirma (modo CLI: pede ENTER pra prosseguir)
  process.stdout.write("\n  Apertar ENTER pra aplicar (Ctrl+C pra cancelar)... ");
  await new Promise(r => process.stdin.once("data", r));

  // 6. UPDATE
  const { data: after, error: updErr } = await sb
    .from("negocios").update(cleanPatch).eq("id", id).select("*").single();
  if (updErr) { console.error("\n❌ Erro no UPDATE:", updErr.message); process.exit(1); }

  console.log("\n  ✅ Aplicado!");
  console.log(`\n  Pra reverter:`);
  const revertPatch = Object.fromEntries(changed.map(k => [k, before[k]]));
  const revertArgs = Object.entries(revertPatch).map(([k,v]) => `${k}=${v === null ? "" : v}`).join(" ");
  console.log(`    node --env-file=.env test.mjs edit ${id} ${revertArgs}`);

  process.exit(0);
}

// ─── main ────────────────────────────────────────────────────────────────────
const [cmd, ...args] = process.argv.slice(2);
switch (cmd) {
  case "list": await cmdList(); break;
  case "get":  await cmdGet(args[0]); break;
  case "edit": await cmdEdit(args[0], args.slice(1)); break;
  default:
    console.log(`Uso:
  node --env-file=.env test.mjs list                           — lista 15 últimos
  node --env-file=.env test.mjs get <negocio_id>               — mostra completo
  node --env-file=.env test.mjs edit <negocio_id> campo=valor  — edita (interativo)

Exemplos:
  node --env-file=.env test.mjs list
  node --env-file=.env test.mjs edit abc-uuid badge_texto=TESTE
  node --env-file=.env test.mjs edit abc-uuid preco=350000 status=ativo`);
}
