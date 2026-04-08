import { supabase } from "@/lib/supabase";

export interface Lead {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  mensagem: string;
  origem: string;
  negocio_id?: string;
  negocio_titulo?: string;
  galeria_id?: string;
  galeria_nome?: string;
  espaco_id?: string;
  espaco_numero?: string;
  criado_em: string;
  status: "novo" | "em-andamento" | "convertido" | "perdido";
}

// ---- Public functions (async, hit Supabase) ----

export async function getAllLeads(): Promise<Lead[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let query = supabase
    .from("leads")
    .select("*")
    .order("criado_em", { ascending: false });

  // Só filtra por corretor_id se o usuário for explicitamente corretor
  // Admin ou sem profile vê tudo
  if (profile?.role === "corretor") {
    query = query.or(`corretor_id.eq.${user.id},corretor_id.is.null`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Erro ao buscar leads:", error);
    return [];
  }
  return data as Lead[];
}

export async function addLead(lead: {
  nome: string;
  email: string;
  telefone?: string;
  mensagem?: string;
  origem: string;
  negocio_id?: string;
  negocio_titulo?: string;
  galeria_id?: string;
  galeria_nome?: string;
  espaco_id?: string;
  espaco_numero?: string;
}): Promise<boolean> {
  // Busca corretor responsável pelo negócio ou galeria
  let corretor_id: string | null = null;

  if (lead.negocio_id) {
    const { data: negocio } = await supabase
      .from("negocios")
      .select("corretor_id")
      .eq("id", lead.negocio_id)
      .single();
    corretor_id = negocio?.corretor_id ?? null;
  } else if (lead.galeria_id) {
    const { data: galeria } = await supabase
      .from("galerias")
      .select("corretor_id")
      .eq("id", lead.galeria_id)
      .single();
    corretor_id = galeria?.corretor_id ?? null;
  }

  const { error } = await supabase
    .from("leads")
    .insert({
      nome: lead.nome,
      email: lead.email || null,
      telefone: lead.telefone || null,
      mensagem: lead.mensagem || null,
      origem: lead.origem,
      negocio_id: lead.negocio_id || null,
      negocio_titulo: lead.negocio_titulo || null,
      galeria_id: lead.galeria_id || null,
      galeria_nome: lead.galeria_nome || null,
      espaco_id: lead.espaco_id || null,
      espaco_numero: lead.espaco_numero || null,
      corretor_id,
      status: "novo",
    });

  if (error) {
    console.error("Erro ao salvar lead:", error);
    return false;
  }
  return true;
}

export async function updateLeadStatus(
  id: string,
  status: Lead["status"]
): Promise<void> {
  const { error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", id);

  if (error) {
    console.error("Erro ao atualizar lead:", error);
  }
}

export function calculateLeadScore(lead: Lead): number {
  let score = 0;

  // Tem WhatsApp/telefone — contato direto possível
  if (lead.telefone) score += 20;

  // Mensagem substancial — lead engajado
  if (lead.mensagem && lead.mensagem.length > 50) score += 20;
  else if (lead.mensagem && lead.mensagem.length > 10) score += 10;

  // Origem — intenção de compra vs curiosidade
  const origemScore: Record<string, number> = {
    "contato-negocio": 30,
    "contato-galeria": 25,
    whatsapp: 20,
    anunciar: 15,
    "exit-intent": 10,
    newsletter: 5,
  };
  score += origemScore[lead.origem] || 0;

  // Interesse específico identificado
  if (lead.negocio_titulo || lead.galeria_nome) score += 10;

  // Recência — lead quente nas primeiras 48h
  const horasPassadas =
    (Date.now() - new Date(lead.criado_em).getTime()) / (1000 * 60 * 60);
  if (horasPassadas < 24) score += 10;
  else if (horasPassadas < 48) score += 5;

  return Math.min(score, 100);
}

export function getScoreLabel(score: number): {
  label: string;
  color: string;
} {
  if (score >= 75) return { label: "Quente", color: "bg-red-100 text-red-700" };
  if (score >= 50)
    return { label: "Morno", color: "bg-amber-100 text-amber-700" };
  if (score >= 25) return { label: "Frio", color: "bg-blue-100 text-blue-700" };
  return { label: "Gelado", color: "bg-slate-100 text-slate-500" };
}

export async function getLeadStats() {
  const leads = await getAllLeads();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const leadsHoje = leads.filter((l) => new Date(l.criado_em) >= today).length;
  const leadsSemana = leads.filter((l) => new Date(l.criado_em) >= weekAgo).length;
  const novos = leads.filter((l) => l.status === "novo").length;
  const emAndamento = leads.filter((l) => l.status === "em-andamento").length;
  const convertidos = leads.filter((l) => l.status === "convertido").length;
  const perdidos = leads.filter((l) => l.status === "perdido").length;

  const porOrigem: Record<string, number> = {};
  for (const lead of leads) {
    porOrigem[lead.origem] = (porOrigem[lead.origem] || 0) + 1;
  }

  const taxaConversao =
    leads.length > 0 ? Math.round((convertidos / leads.length) * 100) : 0;

  return {
    total: leads.length,
    leadsHoje,
    leadsSemana,
    novos,
    emAndamento,
    convertidos,
    perdidos,
    porOrigem,
    taxaConversao,
  };
}
