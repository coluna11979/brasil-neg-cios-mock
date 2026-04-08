import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Listing } from "@/data/mockListings";

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
  tipo: "venda" | "venda-imovel" | "aluguel-imovel" | "franquia" | "galeria";
  cidade: string;
  estado: string;
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

      if (filters?.categoria) query = query.eq("categoria", filters.categoria);
      if (filters?.tipo) {
        if (filters.tipo === "negocio") query = query.eq("tipo", "venda");
        else if (filters.tipo === "imovel") query = query.in("tipo", ["venda-imovel", "aluguel-imovel"]);
        else if (filters.tipo === "salao") query = query.eq("tipo", "aluguel-imovel");
        else if (filters.tipo === "galeria") query = query.eq("tipo", "galeria");
        else if (filters.tipo === "franquia") query = query.eq("tipo", "franquia");
      }
      if (filters?.preco_min) query = query.gte("preco", filters.preco_min);
      if (filters?.preco_max) query = query.lte("preco", filters.preco_max);
      if (filters?.faturamento_min) query = query.gte("faturamento_mensal", filters.faturamento_min);
      if (filters?.cidade) query = query.ilike("cidade", `%${filters.cidade}%`);
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
