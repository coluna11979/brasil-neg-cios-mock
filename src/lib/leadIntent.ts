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
  const item = lead.galeria_nome || lead.negocio_titulo || "seu negócio/imóvel";
  switch (intent) {
    case "vendedor":
      return `Este lead é um VENDEDOR/ANUNCIANTE — quer anunciar e VENDER ${item}. NÃO trate como interessado em comprar. A postura correta é: parabenizar pela decisão, qualificar o que ele tem para anunciar, explicar próximos passos da plataforma e marcar uma conversa com um consultor.`;
    case "comprador":
      return `Este lead é um POSSÍVEL COMPRADOR — demonstrou interesse em ${item}. A postura correta é: confirmar o interesse, qualificar perfil (orçamento, urgência, experiência) e oferecer próximos passos (visita/mais informações).`;
    case "newsletter":
      return `Este lead apenas se inscreveu em conteúdo/newsletter. Postura: descobrir qual o real interesse (vender ou comprar) sem assumir nada.`;
    case "interno":
      return `Este lead foi criado manualmente no CRM pela equipe. Use o histórico/mensagem para inferir o contexto.`;
    default:
      return `Não está claro se o lead é vendedor ou comprador. Faça UMA pergunta curta para descobrir antes de avançar.`;
  }
}
