/**
 * Classifica a INTENÇÃO do lead com base em `origem`, `mensagem` e contexto.
 * Usado pelos prompts da IA para falar com a postura certa:
 *  - "vendedor"  → quer ANUNCIAR/VENDER algo (galeria, negócio, terreno, franquia)
 *  - "comprador" → quer COMPRAR / saber mais sobre um anúncio existente
 *  - "newsletter"→ só assinou conteúdo / oportunidades
 *  - "interno"   → criado manualmente pelo admin no CRM
 *  - "indefinido"→ não deu pra inferir
 */
export type LeadIntent = "vendedor" | "comprador" | "newsletter" | "interno" | "indefinido";

export interface LeadIntentInput {
  origem?: string | null;
  mensagem?: string | null;
  negocio_id?: string | null;
  galeria_id?: string | null;
  negocio_titulo?: string | null;
  galeria_nome?: string | null;
}

export function getLeadIntent(lead: LeadIntentInput): LeadIntent {
  const origem = (lead.origem || "").toLowerCase();
  const msg = (lead.mensagem || "").toLowerCase();

  // Origens explícitas de vendedor/anunciante
  if (
    origem.startsWith("anunciar") ||
    origem.startsWith("vender") ||
    origem === "chatbot-vendedor" ||
    origem === "sou-dono"
  ) return "vendedor";

  // Origens explícitas de comprador (lead interagiu com um anúncio específico)
  if (
    origem === "contato-galeria" ||
    origem === "contato-negocio" ||
    origem === "anuncio" ||
    origem === "busca" ||
    (origem === "chatbot" && (!!lead.negocio_id || !!lead.galeria_id))
  ) return "comprador";

  // Newsletter / inscrição passiva
  if (origem === "newsletter") return "newsletter";

  // Criados manualmente pelo admin
  if (origem === "crm" || origem === "admin") return "interno";

  // Heurística leve pelo texto da mensagem
  if (msg) {
    if (/anunciar|vender|sou (?:dono|propriet)|tenho (?:uma|um) (?:galeria|loja|neg)/i.test(msg)) return "vendedor";
    if (/quero (?:comprar|saber|conhecer|alugar)|interesse|qual (?:o|a) (?:valor|pre)/i.test(msg)) return "comprador";
  }

  // Chatbot genérico sem contexto → assume comprador (caminho mais comum)
  if (origem === "chatbot") return "comprador";

  return "indefinido";
}

/** Descrição em português pra injetar no prompt da IA. */
export function describeIntent(intent: LeadIntent, lead: LeadIntentInput): string {
  const item = lead.galeria_nome || lead.negocio_titulo || "o item";
  switch (intent) {
    case "vendedor":
      return `Este lead é o DONO/ANUNCIANTE de "${item}". Ele NÃO quer comprar nem alugar — ele quer ANUNCIAR e VENDER "${item}" pela NegociaAky.

REGRAS OBRIGATÓRIAS:
- NUNCA diga "vi seu interesse em ${item}" — ele JÁ é dono, não tem interesse, tem propriedade.
- NUNCA ofereça visita/conhecer o espaço — ELE conhece, é dele.
- NUNCA pergunte sobre orçamento de compra.
- NUNCA misture "seu interesse pelo ${item}" com "anunciar sua galeria" na mesma frase — isso é contraditório.
- DIGA: cumprimentar pela decisão de anunciar, perguntar objetivo da venda (prazo, motivo, valor esperado), explicar como a plataforma ajuda a achar comprador, propor conversa com consultor.`;
    case "comprador":
      return `Este lead é um POSSÍVEL COMPRADOR/INTERESSADO em "${item}". A postura correta é: confirmar o interesse, qualificar perfil (orçamento, urgência, experiência) e oferecer próximos passos (visita/mais informações/conversa).`;
    case "newsletter":
      return `Este lead apenas se inscreveu em conteúdo/newsletter. Postura: descobrir qual o real interesse (vender ou comprar) sem assumir nada.`;
    case "interno":
      return `Este lead foi criado manualmente no CRM pela equipe. Use o histórico/mensagem para inferir o contexto.`;
    default:
      return `Não está claro se o lead é vendedor ou comprador. Faça UMA pergunta curta para descobrir antes de avançar.`;
  }
}

/** Rótulo correto para o item relacionado, conforme a intent. */
export function intentItemLabel(intent: LeadIntent): string {
  switch (intent) {
    case "vendedor":   return "Item que ele está ANUNCIANDO À VENDA";
    case "comprador":  return "Item de interesse (que ele pode comprar)";
    case "newsletter": return "Item relacionado";
    case "interno":    return "Item relacionado";
    default:           return "Item relacionado";
  }
}
