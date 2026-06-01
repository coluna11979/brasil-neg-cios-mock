import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Listing } from "@/data/mockListings";

// Quando o usuário filtra por "Zona Sul/Norte/Leste/Oeste/Centro", expandimos
// para os bairros que pertencem àquela zona — busca em titulo/descricao/bairro.
const ZONA_BAIRROS: Record<string, string[]> = {
  "Zona Sul":   ["Moema", "Vila Mariana", "Vila Olímpia", "Vila Olimpia", "Itaim", "Itaim Bibi", "Jardins", "Brooklin", "Ipiranga", "Saúde", "Saude", "Paraíso", "Paraiso", "Campo Belo", "Santo Amaro", "Chácara", "Chacara"],
  "Zona Norte": ["Santana", "Tucuruvi", "Casa Verde", "Jaçanã", "Jacana", "Vila Guilherme", "Brasilândia", "Brasilandia", "Freguesia"],
  "Zona Leste": ["Tatuapé", "Tatuape", "Mooca", "Penha", "Aricanduva", "Itaquera", "São Miguel", "Sao Miguel", "Carrão", "Carrao"],
  "Zona Oeste": ["Pinheiros", "Perdizes", "Lapa", "Vila Madalena", "Butantã", "Butanta", "Barra Funda", "Alto de Pinheiros", "Sumaré", "Sumare", "Pompéia", "Pompeia", "Morumbi"],
  "Centro":     ["Centro", "Sé", "Se", "República", "Republica", "Consolação", "Consolacao", "Bela Vista", "Liberdade", "Bom Retiro", "Brás", "Bras"],
};

// Mapeia o nome amigável da categoria para todos os valores aceitos no banco
// (cobre slugs antigos + nomes com acento atuais).
const CATEGORIA_ALIASES: Record<string, string[]> = {
  "Alimentação":         ["Alimentação", "alimentacao", "alimentação"],
  "Saúde e Estética":    ["Saúde e Estética", "saude-beleza", "saude-estetica", "saude-e-estetica"],
  "Serviços":            ["Serviços", "servicos", "serviços"],
  "Varejo":              ["Varejo", "varejo"],
  "Tecnologia":          ["Tecnologia", "tecnologia"],
  "Educação":            ["Educação", "educacao", "educação"],
  "Automotivo":          ["Automotivo", "automotivo"],
  "Indústria":           ["Indústria", "industria", "indústria"],
  "Imóveis Comerciais":  ["Imóveis Comerciais", "imoveis-comerciais", "imóveis-comerciais"],
  "Outro":               ["Outro", "outro", "outros"],
};

export function adaptNegocio(n: NegocioSupabase): Listing {
  return {
    id: n.id,
    titulo: n.titulo,
    categoria: n.categoria,
    tipo: n.tipo as Listing["tipo"],
    cidade: n.cidade,
    estado: n.estado,
    preco: n.preco,
    faturamentoMensal: n.faturamento_mensal,
    areaM2: n.area_m2 ?? undefined,
    descricao: n.descricao,
    descricaoCompleta: n.descricao_completa ?? "",
    imagem: n.imagem ?? "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
    imagens: n.imagens ?? undefined,
    destaque: n.destaque,
  };
}

export interface NegocioSupabase {
  id: string;
  titulo: string;
  categoria: string;
  tipo: "venda" | "venda-imovel" | "aluguel-imovel" | "franquia" | "galeria" | "negocio" | "imovel";
  cidade: string;
  estado: string;
  bairro: string | null;
  preco: number;
  faturamento_mensal: number;
  area_m2: number | null;
  descricao: string;
  descricao_completa: string | null;
  imagem: string | null;
  imagens: string[] | null;
  destaque: boolean;
  status: string;
  proprietario_nome: string;
  proprietario_telefone: string;
  proprietario_email: string | null;
  criado_em: string;
}

export interface EspacoSupabase {
  id: string;
  galeria_id: string;
  numero: string;
  tipo: "loja" | "sala" | "quiosque" | "box";
  area_m2: number;
  valor_aluguel: number;
  andar: string | null;
  descricao: string;
  disponivel: boolean;
}

export interface GaleriaSupabase {
  id: string;
  nome: string;
  endereco: string;
  cidade: string;
  estado: string;
  descricao: string;
  imagem: string | null;
  espacos: EspacoSupabase[];
}

export function useNegocios(filters?: {
  categoria?: string;
  tipo?: string;
  busca?: string;
  preco_min?: number;
  preco_max?: number;
  faturamento_min?: number;
  cidade?: string;
  bairro?: string;
}) {
  const [negocios, setNegocios] = useState<NegocioSupabase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let query = supabase
        .from("negocios")
        .select("*")
        .eq("status", "ativo")
        .eq("estado", "SP")
        .order("destaque", { ascending: false })
        .order("criado_em", { ascending: false });

      if (filters?.categoria) {
        // Categoria pode vir como nome amigável ("Alimentação") ou slug ("alimentacao").
        // O banco tem dados em ambos os formatos, então aceitamos os 2.
        const aliases = CATEGORIA_ALIASES[filters.categoria] || [filters.categoria];
        query = query.in("categoria", aliases);
      }
      if (filters?.tipo) {
        // Aceita tanto os tipos NOVOS (negocio, imovel, franquia, galeria) quanto os antigos
        // (venda, venda-imovel, aluguel-imovel, franquia, galeria) — coexistem no banco.
        if (filters.tipo === "negocio") query = query.in("tipo", ["negocio", "venda"]);
        else if (filters.tipo === "imovel") query = query.in("tipo", ["imovel", "venda-imovel", "aluguel-imovel"]);
        else if (filters.tipo === "salao") query = query.eq("tipo", "aluguel-imovel");
        else if (filters.tipo === "galeria") query = query.eq("tipo", "galeria");
        else if (filters.tipo === "franquia") query = query.eq("tipo", "franquia");
      }
      if (filters?.preco_min) query = query.gte("preco", filters.preco_min);
      if (filters?.preco_max) query = query.lte("preco", filters.preco_max);
      if (filters?.faturamento_min) query = query.gte("faturamento_mensal", filters.faturamento_min);
      if (filters?.cidade) query = query.ilike("cidade", `%${filters.cidade}%`);
      // Bairro: além do campo bairro (geralmente nulo), busca em titulo+descricao
      // porque os cadastros antigos colocam o bairro no titulo.
      // Se for uma ZONA (Sul/Norte/Leste/Oeste/Centro), expande pra todos os bairros dela.
      if (filters?.bairro) {
        const sanitize = (s: string) => s.replace(/[(),"'`]/g, "");
        const bairrosBusca = ZONA_BAIRROS[filters.bairro] || [filters.bairro];
        const orParts: string[] = [];
        bairrosBusca.forEach((b) => {
          const safe = sanitize(b);
          orParts.push(`bairro.ilike.%${safe}%`);
          orParts.push(`titulo.ilike.%${safe}%`);
          orParts.push(`descricao.ilike.%${safe}%`);
        });
        query = query.or(orParts.join(","));
      }
      if (filters?.busca) {
        query = query.or(
          `titulo.ilike.%${filters.busca}%,descricao.ilike.%${filters.busca}%`
        );
      }

      const { data, error } = await query;
      if (error) setError(error.message);
      else setNegocios(data || []);
      setLoading(false);
    };

    fetch();
  }, [
    filters?.categoria,
    filters?.tipo,
    filters?.busca,
    filters?.preco_min,
    filters?.preco_max,
    filters?.faturamento_min,
    filters?.cidade,
    filters?.bairro,
  ]);

  return { negocios, loading, error };
}

export function useGalerias() {
  const [galerias, setGalerias] = useState<GaleriaSupabase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("galerias")
        .select("*, espacos:espacos_galeria(*)")
        .eq("estado", "SP")
        .order("criado_em", { ascending: false });
      setGalerias(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  return { galerias, loading };
}
