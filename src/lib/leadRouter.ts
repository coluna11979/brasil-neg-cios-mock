import { supabase } from "@/lib/supabase";

/**
 * Escolhe o corretor mais qualificado para atender um lead recém-chegado.
 *
 * Heurística (somatório de pontos):
 *  +10 se corretor.atuacao casa com a categoria/título do lead
 *      (ou se a atuação for "todos")
 *  +8  se a região/bairro do corretor casa com o bairro/cidade/texto do lead
 *  +5  base — todo corretor ativo é candidato
 *  −2  por lead ativo (novo/em-andamento) já atribuído — load balance
 *
 * Em caso de empate, pega quem foi cadastrado mais recentemente (rotação).
 * Retorna null se não houver nenhum corretor ativo.
 */
export interface LeadContext {
  nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  mensagem?: string | null;
  origem?: string | null;
  negocio_titulo?: string | null;
  galeria_nome?: string | null;
}

interface CorretorProfile {
  id: string;
  nome: string;
  bairro: string | null;
  regiao: string | null;
  atuacao: string | null;
  criado_em: string;
}

function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Texto agregado do lead pra ser comparado contra atributos do corretor. */
function leadText(lead: LeadContext): string {
  return normalize(
    [
      lead.nome, lead.mensagem, lead.origem,
      lead.negocio_titulo, lead.galeria_nome,
    ].filter(Boolean).join(" ")
  );
}

/** Texto agregado do corretor (region/bairro/atuacao) pra cruzar com lead. */
function corretorText(c: CorretorProfile): string {
  return normalize([c.bairro, c.regiao, c.atuacao].filter(Boolean).join(" "));
}

export async function pickBestCorretor(lead: LeadContext): Promise<string | null> {
  // 1) Busca corretores ativos
  const { data: corretores } = await supabase
    .from("profiles")
    .select("id, nome, bairro, regiao, atuacao, criado_em")
    .eq("role", "corretor")
    .eq("ativo", true);

  const list = (corretores || []) as CorretorProfile[];
  if (list.length === 0) return null;

  // 2) Conta leads ativos (novo + em-andamento) por corretor — load balance
  const { data: leads } = await supabase
    .from("leads")
    .select("corretor_id, status")
    .in("status", ["novo", "em-andamento"]);
  const load: Record<string, number> = {};
  (leads || []).forEach((l: { corretor_id: string | null; status: string }) => {
    if (l.corretor_id) load[l.corretor_id] = (load[l.corretor_id] || 0) + 1;
  });

  // 3) Score
  const txtLead = leadText(lead);
  let best: { id: string; score: number; criado_em: string } | null = null;

  for (const c of list) {
    let score = 5; // base — todo corretor ativo é candidato
    const txtCor = corretorText(c);
    const atuacao = normalize(c.atuacao || "");

    // Match de atuação:
    //  +12 se a atuação específica do corretor aparece no lead (ex: "alimentação")
    //  +3  se é generalista ("todos"/"geral") — recompensa leve, não compete com load balance
    if (atuacao && (atuacao === "todos" || atuacao === "geral")) {
      score += 3;
    } else if (atuacao && txtLead.includes(atuacao)) {
      score += 12;
    }

    // Match de região/bairro: alguma palavra (>=4 chars) do perfil aparece no lead
    if (txtCor) {
      const palavrasCor = txtCor.split(" ").filter((p) => p.length >= 4);
      if (palavrasCor.some((p) => txtLead.includes(p))) score += 8;
    }

    // Penalty por carga ativa (load balance agressivo)
    score -= (load[c.id] || 0) * 3;

    if (!best || score > best.score ||
        (score === best.score && new Date(c.criado_em).getTime() > new Date(best.criado_em).getTime())) {
      best = { id: c.id, score, criado_em: c.criado_em };
    }
  }

  return best?.id ?? null;
}
