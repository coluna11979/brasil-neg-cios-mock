export interface Listing {
  id: string;
  titulo: string;
  categoria: string;
  cidade: string;
  estado: string;
  preco: number;
  faturamentoMensal: number;
  descricao: string;
  descricaoCompleta: string;
  imagem: string;
  destaque?: boolean;
  tipo?: "venda" | "venda-imovel" | "aluguel-imovel";
  areaM2?: number;
}

export const categorias = [
  { id: "alimentacao", nome: "Alimentação", icone: "UtensilsCrossed" },
  { id: "saude-beleza", nome: "Saúde e Beleza", icone: "Heart" },
  { id: "servicos", nome: "Serviços", icone: "Briefcase" },
  { id: "varejo", nome: "Varejo", icone: "ShoppingBag" },
  { id: "tecnologia", nome: "Tecnologia", icone: "Laptop" },
  { id: "educacao", nome: "Educação", icone: "GraduationCap" },
  { id: "automotivo", nome: "Automotivo", icone: "Car" },
  { id: "industria", nome: "Indústria", icone: "Factory" },
  { id: "imoveis-comerciais", nome: "Imóveis Comerciais", icone: "Building2" },
];

export const estados = [
  "SP", "RJ", "MG", "RS", "PR", "SC", "BA", "PE", "CE", "GO", "DF"
];

export const faixasPreco = [
  { label: "Até R$ 50.000", min: 0, max: 50000 },
  { label: "R$ 50.000 - R$ 150.000", min: 50000, max: 150000 },
  { label: "R$ 150.000 - R$ 300.000", min: 150000, max: 300000 },
  { label: "R$ 300.000 - R$ 500.000", min: 300000, max: 500000 },
  { label: "Acima de R$ 500.000", min: 500000, max: Infinity },
];

export const mockListings: Listing[] = [
  {
    id: "1",
    titulo: "Pizzaria Tradicional em Ponto Nobre",
    categoria: "alimentacao",
    cidade: "São Paulo",
    estado: "SP",
    preco: 280000,
    faturamentoMensal: 85000,
    descricao: "Pizzaria consolidada há 12 anos com clientela fiel e excelente localização.",
    descricaoCompleta: "Pizzaria tradicional estabelecida há 12 anos em um dos bairros mais nobres de São Paulo. Clientela consolidada com alta taxa de fidelização. Equipamentos modernos e em perfeito estado. Capacidade para 60 pessoas sentadas. Delivery próprio com motoboys fixos. Receitas exclusivas e fornecedores de qualidade. Funcionários treinados inclusos na negociação. Faturamento consistente mesmo em períodos de crise.",
    imagem: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800",
    destaque: true,
  },
  {
    id: "2",
    titulo: "Clínica de Estética Premium",
    categoria: "saude-beleza",
    cidade: "Rio de Janeiro",
    estado: "RJ",
    preco: 450000,
    faturamentoMensal: 120000,
    descricao: "Clínica completa com equipamentos de última geração e carteira de clientes VIP.",
    descricaoCompleta: "Clínica de estética localizada em área premium do Rio de Janeiro. Equipamentos de última geração importados. Carteira com mais de 500 clientes ativos. Equipe técnica especializada e fidelizada. Parcerias com dermatologistas renomados. Ambiente sofisticado e climatizado. Sistema de gestão integrado. Potencial de expansão com novos procedimentos.",
    imagem: "https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=800",
    destaque: true,
  },
  {
    id: "3",
    titulo: "Loja de Roupas Femininas",
    categoria: "varejo",
    cidade: "Curitiba",
    estado: "PR",
    preco: 120000,
    faturamentoMensal: 45000,
    descricao: "Boutique feminina em shopping center com marca própria consolidada.",
    descricaoCompleta: "Boutique de moda feminina localizada em shopping de alto fluxo em Curitiba. Marca própria estabelecida há 8 anos. Estoque atualizado com as tendências da estação. E-commerce integrado com boa performance. Base de clientes fiéis com programa de fidelidade. Contrato de aluguel favorável por mais 3 anos. Possibilidade de franquear a marca.",
    imagem: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800",
  },
  {
    id: "4",
    titulo: "Escola de Idiomas Franqueada",
    categoria: "educacao",
    cidade: "Belo Horizonte",
    estado: "MG",
    preco: 380000,
    faturamentoMensal: 95000,
    descricao: "Franquia de escola de idiomas com metodologia reconhecida e 200+ alunos ativos.",
    descricaoCompleta: "Escola de idiomas de franquia renomada nacionalmente. Mais de 200 alunos matriculados. Metodologia própria com material didático incluso. Professores qualificados e certificados. Localização estratégica próxima a universidades. Sistema de gestão e marketing fornecido pela franqueadora. Suporte contínuo da marca. Potencial de crescimento com cursos corporativos.",
    imagem: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800",
    destaque: true,
  },
  {
    id: "5",
    titulo: "Oficina Mecânica Especializada",
    categoria: "automotivo",
    cidade: "Porto Alegre",
    estado: "RS",
    preco: 195000,
    faturamentoMensal: 65000,
    descricao: "Oficina completa especializada em veículos importados com clientes corporativos.",
    descricaoCompleta: "Oficina mecânica especializada em veículos importados premium. Localização em área industrial de fácil acesso. Equipamentos de diagnóstico computadorizado. Contratos com frotas corporativas. Equipe de 5 mecânicos especializados. Estoque de peças próprio. Área de 400m² com capacidade para 8 veículos simultâneos. Parceria com seguradoras para sinistros.",
    imagem: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800",
  },
  {
    id: "6",
    titulo: "Cafeteria Gourmet em Área Comercial",
    categoria: "alimentacao",
    cidade: "Florianópolis",
    estado: "SC",
    preco: 150000,
    faturamentoMensal: 55000,
    descricao: "Cafeteria especializada com torrefação própria e ambiente instagramável.",
    descricaoCompleta: "Cafeteria gourmet com conceito diferenciado e ambiente instagramável. Torrefação própria de grãos especiais. Cardápio de brunch muito procurado. Localização em área comercial de alto movimento. Decoração autoral e mobiliário de design. Presença forte nas redes sociais. Receitas exclusivas de doces artesanais. Equipe jovem e engajada.",
    imagem: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800",
  },
  {
    id: "7",
    titulo: "Agência de Marketing Digital",
    categoria: "tecnologia",
    cidade: "São Paulo",
    estado: "SP",
    preco: 320000,
    faturamentoMensal: 110000,
    descricao: "Agência com carteira de 25 clientes recorrentes e equipe remota estruturada.",
    descricaoCompleta: "Agência de marketing digital com 6 anos de mercado. Carteira de 25 clientes com contratos recorrentes. Equipe de 8 profissionais trabalhando remotamente. Processos e metodologias documentadas. Ferramentas e softwares com licenças ativas. Especialização em e-commerce e performance. Parcerias com Google e Meta. Possibilidade de transição gradual com mentoria.",
    imagem: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800",
  },
  {
    id: "8",
    titulo: "Pet Shop com Clínica Veterinária",
    categoria: "servicos",
    cidade: "Goiânia",
    estado: "GO",
    preco: 250000,
    faturamentoMensal: 75000,
    descricao: "Pet shop completo com banho/tosa, clínica veterinária e hotel para pets.",
    descricaoCompleta: "Pet shop completo em bairro residencial de alto padrão. Serviços de banho, tosa, clínica veterinária e hotel. Equipamentos modernos e sala cirúrgica equipada. Base de 800+ pets cadastrados. Equipe de 2 veterinários e 4 tosadores. Sistema de agendamento online. Programa de fidelidade ativo. Estoque de produtos premium.",
    imagem: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800",
  },
  {
    id: "9",
    titulo: "Restaurante Japonês Delivery",
    categoria: "alimentacao",
    cidade: "Salvador",
    estado: "BA",
    preco: 180000,
    faturamentoMensal: 70000,
    descricao: "Restaurante japonês focado em delivery com alta demanda nos apps.",
    descricaoCompleta: "Restaurante japonês com foco em delivery e takeaway. Excelente avaliação nos principais aplicativos. Cozinha otimizada para produção em escala. Cardápio enxuto e rentável. Fornecedores de pescados de qualidade. Embalagens personalizadas e sustentáveis. Sistema próprio de pedidos online. Possibilidade de expansão para outras regiões.",
    imagem: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800",
  },
  {
    id: "10",
    titulo: "Academia de Ginástica",
    categoria: "saude-beleza",
    cidade: "Recife",
    estado: "PE",
    preco: 420000,
    faturamentoMensal: 130000,
    descricao: "Academia completa com 600m² e mais de 400 alunos matriculados.",
    descricaoCompleta: "Academia de ginástica com 600m² em localização privilegiada. Mais de 400 alunos ativos com planos mensais e anuais. Equipamentos Technogym e Movement. Área de musculação, funcional, spinning e estúdio de dança. Sistema de catracas e gestão integrada. Vestiários completos com sauna. Estacionamento próprio. Potencial para personal trainers parceiros.",
    imagem: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800",
  },
  {
    id: "11",
    titulo: "Gráfica e Comunicação Visual",
    categoria: "industria",
    cidade: "Campinas",
    estado: "SP",
    preco: 290000,
    faturamentoMensal: 85000,
    descricao: "Gráfica completa com impressão digital e offset, atendendo empresas da região.",
    descricaoCompleta: "Gráfica estabelecida há 15 anos com forte presença no mercado B2B. Equipamentos de impressão digital e offset. Setor de comunicação visual com impressão em grandes formatos. Carteira de clientes corporativos fiéis. Equipe de 12 funcionários capacitados. Software de gestão de produção. Contratos recorrentes com agências de publicidade. Localização industrial com estacionamento.",
    imagem: "https://images.unsplash.com/photo-1562654501-a0ccc0fc3fb1?w=800",
  },
  {
    id: "12",
    titulo: "Loja de Produtos Naturais",
    categoria: "varejo",
    cidade: "Brasília",
    estado: "DF",
    preco: 95000,
    faturamentoMensal: 35000,
    descricao: "Loja especializada em produtos naturais, orgânicos e suplementos.",
    descricaoCompleta: "Loja de produtos naturais em galeria comercial de alto movimento. Mix de produtos orgânicos, suplementos e cosméticos naturais. Parcerias com produtores locais. E-commerce com entrega na região. Base de clientes conscientes e recorrentes. Decoração rústica e acolhedora. Potencial para expansão com produtos a granel. Margens atrativas no segmento.",
    imagem: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800",
  },
  {
    id: "13",
    titulo: "Sala Comercial Premium no Centro",
    categoria: "imoveis-comerciais",
    cidade: "São Paulo",
    estado: "SP",
    preco: 520000,
    faturamentoMensal: 0,
    descricao: "Sala comercial de 120m² em edifício corporativo com infraestrutura completa.",
    descricaoCompleta: "Sala comercial de alto padrão localizada em edifício corporativo no centro financeiro de São Paulo. 120m² de área útil com divisórias em vidro. Recepção compartilhada, 2 vagas de garagem, ar-condicionado central. Prédio com segurança 24h, gerador e heliponto. Próximo ao metrô e principais vias de acesso. Ideal para escritórios de advocacia, consultoria ou coworking.",
    imagem: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
    tipo: "venda-imovel",
    areaM2: 120,
  },
  {
    id: "14",
    titulo: "Galpão Industrial para Aluguel",
    categoria: "imoveis-comerciais",
    cidade: "Guarulhos",
    estado: "SP",
    preco: 18000,
    faturamentoMensal: 0,
    descricao: "Galpão de 800m² com docas, pé-direito alto e localização estratégica.",
    descricaoCompleta: "Galpão industrial de 800m² disponível para aluguel em Guarulhos. Pé-direito de 10 metros, 2 docas para caminhões, piso industrial de alta resistência. Escritório administrativo de 80m², vestiários e refeitório. Energia trifásica, sistema contra incêndio. Localização estratégica próxima à Rodovia Dutra e ao Aeroporto de Guarulhos. Ideal para logística, distribuição ou manufatura.",
    imagem: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800",
    tipo: "aluguel-imovel",
    areaM2: 800,
  },
  {
    id: "15",
    titulo: "Loja de Rua em Bairro Nobre",
    categoria: "imoveis-comerciais",
    cidade: "Rio de Janeiro",
    estado: "RJ",
    preco: 12000,
    faturamentoMensal: 0,
    descricao: "Loja térrea de 65m² com vitrine ampla em rua de alto movimento comercial.",
    descricaoCompleta: "Loja de rua em excelente ponto comercial no Leblon, Rio de Janeiro. 65m² de área com vitrine ampla de vidro. Mezanino para estoque ou escritório. Banheiro e copa. Alto fluxo de pedestres e fácil acesso por transporte público. Ideal para boutique, café, galeria ou serviços. Contrato de aluguel com possibilidade de renovação por 5 anos.",
    imagem: "https://images.unsplash.com/photo-1528698827591-e625c338dea0?w=800",
    tipo: "aluguel-imovel",
    areaM2: 65,
  },
];

export const getListingById = (id: string): Listing | undefined => {
  return mockListings.find((listing) => listing.id === id);
};

export const getListingsByCategory = (categoria: string): Listing[] => {
  return mockListings.filter((listing) => listing.categoria === categoria);
};

export const getFeaturedListings = (): Listing[] => {
  return mockListings.filter((listing) => listing.destaque);
};

export const filterListings = (
  categoria?: string,
  estado?: string,
  precoMin?: number,
  precoMax?: number,
  busca?: string
): Listing[] => {
  return mockListings.filter((listing) => {
    if (categoria && listing.categoria !== categoria) return false;
    if (estado && listing.estado !== estado) return false;
    if (precoMin !== undefined && listing.preco < precoMin) return false;
    if (precoMax !== undefined && listing.preco > precoMax) return false;
    if (busca) {
      const searchLower = busca.toLowerCase();
      return (
        listing.titulo.toLowerCase().includes(searchLower) ||
        listing.descricao.toLowerCase().includes(searchLower) ||
        listing.cidade.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const getCategoryName = (id: string): string => {
  const categoria = categorias.find((c) => c.id === id);
  return categoria?.nome || id;
};
