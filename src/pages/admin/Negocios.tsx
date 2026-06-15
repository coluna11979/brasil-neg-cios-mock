import { useEffect, useRef, useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import {
  Building2,
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  MapPin,
  DollarSign,
  TrendingUp,
  Phone,
  Mail,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Plus,
  X,
  User,
  Ruler,
  Save,
  Pencil,
  Sparkles,
  Camera,
  ImageIcon,
  Store,
  Home,
  Award,
  LayoutGrid,
  Trash2,
  ExternalLink,
  Share2,
  Megaphone,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  UserCheck2,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import CompartilharBuscaModal from "@/components/CompartilharBuscaModal";
import EditGaleriaModal from "@/components/admin/EditGaleriaModal";
import ImagemComLegenda from "@/components/ImagemComLegenda";
import PublicarRedesModal from "@/components/admin/PublicarRedesModal";

// Sugere faixa de preço a partir de um valor numérico
function suggestPriceRange(preco: number | null | undefined): string {
  if (!preco) return "";
  if (preco <= 50_000)  return "Até R$ 50.000";
  if (preco <= 150_000) return "R$ 50.000 - R$ 150.000";
  if (preco <= 300_000) return "R$ 150.000 - R$ 300.000";
  if (preco <= 500_000) return "R$ 300.000 - R$ 500.000";
  return "Acima de R$ 500.000";
}
import { callClaude } from "@/lib/anthropic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getAllNegocios,
  updateNegocioStatus,
  updateNegocio,
  deleteNegocio,
  deleteGaleria,
  formatCurrency,
  type Negocio,
} from "@/stores/negocioStore";
import { supabase } from "@/lib/supabase";

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIAS = [
  "Alimentação",
  "Saúde e Estética",
  "Serviços",
  "Varejo",
  "Tecnologia",
  "Educação",
  "Automotivo",
  "Indústria",
  "Imóveis Comerciais",
  "Outro",
];

// Normaliza slugs antigos do banco para o nome amigável do dropdown
const CATEGORIA_SLUG_MAP: Record<string, string> = {
  "alimentacao": "Alimentação",
  "saude-beleza": "Saúde e Estética",
  "saude-estetica": "Saúde e Estética",
  "saude-e-estetica": "Saúde e Estética",
  "servicos": "Serviços",
  "varejo": "Varejo",
  "tecnologia": "Tecnologia",
  "educacao": "Educação",
  "automotivo": "Automotivo",
  "industria": "Indústria",
  "imoveis-comerciais": "Imóveis Comerciais",
  "imóveis-comerciais": "Imóveis Comerciais",
  "saloes-e-imoveis-comerciais": "Imóveis Comerciais",
  "outro": "Outro",
  "outros": "Outro",
};

function normalizeCategoria(raw: string | null | undefined): string {
  if (!raw) return "";
  if (CATEGORIAS.includes(raw)) return raw;
  return CATEGORIA_SLUG_MAP[raw.toLowerCase()] ?? raw;
}

const ESTADOS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

type StatusFilter = "todos" | "rascunho" | "pendente" | "ativo" | "rejeitado" | "vendido";

const STATUS_CONFIG: Record<
  Negocio["status"],
  { label: string; color: string; bg: string }
> = {
  rascunho: { label: "Rascunho", color: "text-gray-700",  bg: "bg-gray-50 border-gray-200" },
  pendente: { label: "Pendente", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  ativo:    { label: "Ativo",    color: "text-green-700", bg: "bg-green-50 border-green-200" },
  rejeitado:{ label: "Rejeitado",color: "text-red-700",   bg: "bg-red-50 border-red-200" },
  vendido:  { label: "Vendido",  color: "text-blue-700",  bg: "bg-blue-50 border-blue-200" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins} min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  if (days < 30) return `${days} dias atrás`;
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

// ─── New Negocio Modal ────────────────────────────────────────────────────────

const EMPTY_FORM = {
  titulo: "",
  categoria: "",
  cidade: "",
  estado: "",
  bairro: "",
  preco: "",
  faturamento_mensal: "",
  area_m2: "",
  area_venda: "",
  area_estoque: "",
  descricao: "",
  proprietario_nome: "",
  proprietario_telefone: "",
  proprietario_email: "",
  status: "ativo" as Negocio["status"],
  badge_texto: "",
  badge_cor: "green" as "green" | "blue" | "red" | "amber" | "violet" | "slate",
  mostrar_preco_foto: false,
  destaque: false,
};

const BADGE_PRESETS = ["LOCAÇÃO", "VENDA", "OPORTUNIDADE", "PROMOÇÃO", "NOVO", "DESTAQUE", "REDUZIDO"];
const BADGE_CORES: { v: "green" | "blue" | "red" | "amber" | "violet" | "slate"; label: string; cls: string }[] = [
  { v: "green",  label: "Verde",    cls: "bg-green-500" },
  { v: "blue",   label: "Azul",     cls: "bg-blue-500" },
  { v: "red",    label: "Vermelho", cls: "bg-red-500" },
  { v: "amber",  label: "Amarelo",  cls: "bg-amber-500" },
  { v: "violet", label: "Roxo",     cls: "bg-violet-500" },
  { v: "slate",  label: "Preto",    cls: "bg-slate-800" },
];

// ── Tipos de anúncio (mesmos do site público /anunciar) ──────────────────────
type TipoAnuncio = "negocio" | "imovel" | "galeria" | "franquia";

const TIPO_META: Record<TipoAnuncio, { label: string; descricao: string; icon: typeof Building2 }> = {
  negocio:  { label: "Negócio",         descricao: "Empresa em funcionamento à venda", icon: Store },
  imovel:   { label: "Imóvel Comercial", descricao: "Venda ou locação de imóvel",        icon: Home },
  galeria:  { label: "Galeria",          descricao: "Galeria com espaços para locação",  icon: LayoutGrid },
  franquia: { label: "Franquia",         descricao: "Marca para franquear",              icon: Award },
};

interface EspacoForm {
  numero: string;
  tipo: string;
  area_m2: string;
  valor_aluguel: string;
  andar: string;
  disponivel: boolean;
  descricao: string;
}

const EMPTY_ESPACO: EspacoForm = {
  numero: "", tipo: "Loja", area_m2: "", valor_aluguel: "", andar: "", disponivel: true, descricao: "",
};

interface NovoNegocioModalProps {
  onClose: () => void;
  onSaved: (negocio: Negocio) => void;
  /** ID do corretor responsável (se omitido, fica null — uso admin). */
  corretorId?: string;
  /** Status inicial (default "ativo" para admin; passe "pendente" para corretor). */
  defaultStatus?: Negocio["status"];
  /** Se true, esconde o seletor de status (corretor não escolhe — vai como pendente). */
  hideStatusSelector?: boolean;
}

export const NovoNegocioModal = ({
  onClose, onSaved, corretorId, defaultStatus, hideStatusSelector,
}: NovoNegocioModalProps) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [tipoAnuncio, setTipoAnuncio] = useState<TipoAnuncio>("negocio");
  const [form, setForm] = useState({ ...EMPTY_FORM, status: defaultStatus ?? EMPTY_FORM.status });
  // Campos específicos por tipo
  const [imovelExtra, setImovelExtra] = useState({ operacao: "venda" as "venda" | "locacao" | "ambos", tipo_imovel: "" });
  const [galeriaModalidade, setGaleriaModalidade] = useState<"locacao" | "venda">("locacao");
  const [espacos, setEspacos] = useState<EspacoForm[]>([{ ...EMPTY_ESPACO }]);
  const [franquiaExtra, setFranquiaExtra] = useState({ investimento: "", taxa_franquia: "", royalties: "" });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  // Atribuição de corretor (apenas admin — quando corretorId não veio fixo)
  const [corretores, setCorretores] = useState<{ id: string; nome: string }[]>([]);
  const [selectedCorretor, setSelectedCorretor] = useState<string>(corretorId || "");
  useEffect(() => {
    if (corretorId) return; // corretor logado: já vem fixo, não precisa escolher
    supabase
      .from("profiles")
      .select("id, nome")
      .eq("role", "corretor")
      .eq("ativo", true)
      .order("nome")
      .then(({ data }) => setCorretores((data as { id: string; nome: string }[]) || []));
  }, [corretorId]);
  const corretorFinal = corretorId || selectedCorretor || null;
  const MAX_FOTOS = 6;
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  // Previews em memória (URL.createObjectURL)
  const photoPreviews = pendingPhotos.map((f) => URL.createObjectURL(f));

  const handleFotosSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setPendingPhotos((prev) => [...prev, ...files].slice(0, MAX_FOTOS));
    if (e.target) e.target.value = ""; // permite re-selecionar o mesmo arquivo
  };

  const removePhoto = (idx: number) => {
    setPendingPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const movePhotoToFirst = (idx: number) => {
    setPendingPhotos((prev) => {
      if (idx <= 0 || idx >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.unshift(item);
      return copy;
    });
  };

  const handleGerarDescricao = async () => {
    if (!form.titulo && !form.categoria) return;
    setAiLoading(true);
    try {
      const prompt = `Gere uma descrição de venda profissional e atraente para este negócio:
Nome: ${form.titulo || "não informado"}
Categoria: ${form.categoria || "não informada"}
Cidade: ${form.cidade || "São Paulo"}
Área: ${form.area_m2 ? `${form.area_m2} m²` : "não informada"}
Faturamento mensal: ${form.faturamento_mensal ? `R$ ${Number(form.faturamento_mensal).toLocaleString("pt-BR")}` : "não informado"}
Valor pedido: ${form.preco ? `R$ ${Number(form.preco).toLocaleString("pt-BR")}` : "não informado"}

Escreva entre 3 e 5 frases destacando potencial, diferenciais e o perfil ideal de comprador. Tom profissional e direto. Não use asteriscos nem markdown.`;
      const desc = await callClaude(prompt);
      setForm((p) => ({ ...p, descricao: desc.trim() }));
      setErrors((p) => ({ ...p, descricao: "" }));
    } catch {
      /* silently fail */
    } finally {
      setAiLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.titulo.trim()) e.titulo = "Título é obrigatório";
    // Categoria não é obrigatória para galeria (galerias não usam categoria de produto)
    if (tipoAnuncio !== "galeria" && !form.categoria) e.categoria = "Selecione uma categoria";
    if (!form.cidade.trim()) e.cidade = "Cidade é obrigatória";
    if (!form.estado) e.estado = "Selecione o estado";
    if (!form.proprietario_nome.trim()) e.proprietario_nome = "Nome é obrigatório";
    if (!form.proprietario_email.trim()) {
      e.proprietario_email = "E-mail é obrigatório";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.proprietario_email)) {
      e.proprietario_email = "E-mail inválido";
    }
    if (!form.descricao.trim()) e.descricao = "Descrição é obrigatória";

    if (tipoAnuncio === "imovel" && !imovelExtra.tipo_imovel.trim()) {
      e.tipo_imovel = "Informe o tipo do imóvel (ex: Loja, Sala, Galpão)";
    }
    if (tipoAnuncio === "galeria") {
      const algumValido = espacos.some((sp) => sp.numero.trim());
      if (!algumValido) e.espacos = "Adicione ao menos 1 espaço com número";
    }
    if (tipoAnuncio === "franquia" && !franquiaExtra.investimento.trim()) {
      e.investimento = "Informe o investimento inicial";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);

    // ── GALERIA: vai pra tabela própria (galerias) + espacos_galeria ─────────
    if (tipoAnuncio === "galeria") {
      const { data: galeriaData, error: galeriaError } = await supabase
        .from("galerias")
        .insert({
          nome: form.titulo,
          endereco: form.bairro || form.cidade,
          cidade: form.cidade,
          estado: form.estado,
          descricao: form.descricao,
          corretor_id: corretorFinal,
        })
        .select()
        .single();

      if (galeriaError || !galeriaData) {
        setSaving(false);
        setErrors({ submit: "Erro ao salvar galeria. Tente novamente." });
        return;
      }

      // Foto principal (primeira) — galerias só usam 1
      let imagemUrl: string | null = null;
      const fotoPrincipal = pendingPhotos[0];
      if (fotoPrincipal) {
        const path = `galerias/${galeriaData.id}.jpg`;
        await supabase.storage.from("lead-images").upload(path, fotoPrincipal, { upsert: true, contentType: fotoPrincipal.type });
        const { data: urlData } = supabase.storage.from("lead-images").getPublicUrl(path);
        imagemUrl = urlData.publicUrl;
        await supabase.from("galerias").update({ imagem: imagemUrl }).eq("id", galeriaData.id);
      }

      // Espaços
      const espacosValidos = espacos.filter((sp) => sp.numero.trim());
      if (espacosValidos.length > 0) {
        const rows = espacosValidos.map((sp) => ({
          galeria_id: galeriaData.id,
          numero: sp.numero,
          tipo: sp.tipo || "Loja",
          area_m2: sp.area_m2 ? Number(sp.area_m2) : null,
          valor_aluguel: sp.valor_aluguel ? Number(sp.valor_aluguel) : null,
          andar: sp.andar || null,
          disponivel: sp.disponivel,
          descricao: sp.descricao || null,
        }));
        await supabase.from("espacos_galeria").insert(rows);
      }

      setSaving(false);
      // Mapeia para shape de Negocio só pra fechar o modal e atualizar lista
      onSaved({
        ...(galeriaData as unknown as Negocio),
        titulo: galeriaData.nome,
        tipo: "galeria",
        categoria: `Galeria · ${espacosValidos.length} espaço(s)`,
      } as Negocio);
      return;
    }

    // ── NEGÓCIO / IMÓVEL / FRANQUIA: tudo em `negocios` com `tipo` diferente ──
    const extraDesc: string[] = [];
    if (tipoAnuncio === "imovel") {
      extraDesc.push(`Tipo de imóvel: ${imovelExtra.tipo_imovel}`);
      const opLabel =
        imovelExtra.operacao === "locacao" ? "Locação" :
        imovelExtra.operacao === "ambos"   ? "Venda e Locação (aberto às duas modalidades)" :
        "Venda";
      extraDesc.push(`Operação: ${opLabel}`);
    }
    if (tipoAnuncio === "franquia") {
      if (franquiaExtra.investimento) extraDesc.push(`Investimento inicial: R$ ${franquiaExtra.investimento}`);
      if (franquiaExtra.taxa_franquia) extraDesc.push(`Taxa de franquia: R$ ${franquiaExtra.taxa_franquia}`);
      if (franquiaExtra.royalties) extraDesc.push(`Royalties: ${franquiaExtra.royalties}`);
    }
    const descricaoFinal = extraDesc.length
      ? `${form.descricao}\n\n— Detalhes —\n${extraDesc.join("\n")}`
      : form.descricao;

    const { data, error } = await supabase
      .from("negocios")
      .insert({
        titulo: form.titulo,
        tipo: tipoAnuncio, // negocio | imovel | franquia
        categoria: form.categoria || (tipoAnuncio === "imovel" ? imovelExtra.tipo_imovel : ""),
        cidade: form.cidade,
        estado: form.estado,
        bairro: form.bairro || null,
        preco: form.preco ? Number(form.preco) : (tipoAnuncio === "franquia" && franquiaExtra.investimento ? Number(franquiaExtra.investimento) : null),
        faturamento_mensal: form.faturamento_mensal ? Number(form.faturamento_mensal) : null,
        area_m2: form.area_m2 ? Number(form.area_m2) : null,
        area_venda: form.area_venda ? Number(form.area_venda) : null,
        area_estoque: form.area_estoque ? Number(form.area_estoque) : null,
        descricao: descricaoFinal,
        proprietario_nome: form.proprietario_nome,
        proprietario_telefone: form.proprietario_telefone || null,
        proprietario_email: form.proprietario_email,
        status: form.status,
        corretor_id: corretorFinal,
        badge_texto: form.badge_texto.trim() || null,
        badge_cor: form.badge_cor,
        mostrar_preco_foto: form.mostrar_preco_foto,
        destaque: form.destaque,
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      setErrors({ submit: "Erro ao salvar. Tente novamente." });
      return;
    }

    let savedNegocio = data as Negocio;

    // Upload de até 6 imagens. A primeira vira a `imagem` principal,
    // todas vão pro array `imagens`.
    if (pendingPhotos.length > 0 && savedNegocio.id) {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < pendingPhotos.length; i++) {
        const file = pendingPhotos[i];
        const ext = (file.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
        const path = `negocios/${savedNegocio.id}-${i}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("lead-images")
          .upload(path, file, { upsert: true, contentType: file.type });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("lead-images").getPublicUrl(path);
          uploadedUrls.push(urlData.publicUrl);
        }
      }
      if (uploadedUrls.length > 0) {
        await supabase
          .from("negocios")
          .update({ imagem: uploadedUrls[0], imagens: uploadedUrls })
          .eq("id", savedNegocio.id);
        savedNegocio = { ...savedNegocio, imagem: uploadedUrls[0], imagens: uploadedUrls } as Negocio;
      }
    }

    onSaved(savedNegocio);
  };

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // ── Wizard: validação por step antes de permitir avançar ──
  const validateStep = (s: number): boolean => {
    const errs: Record<string, string> = {};
    if (s === 2) {
      if (!form.titulo.trim()) errs.titulo = "Dê um nome ao anúncio";
      if (tipoAnuncio !== "galeria" && !form.categoria) errs.categoria = "Escolha uma categoria";
      if (!form.cidade.trim()) errs.cidade = "Cidade obrigatória";
      if (!form.estado) errs.estado = "Selecione o estado";
      if (!form.descricao.trim()) errs.descricao = "Faça uma descrição";
      if (tipoAnuncio === "imovel" && !imovelExtra.tipo_imovel.trim())
        errs.tipo_imovel = "Informe o tipo do imóvel";
      if (tipoAnuncio === "galeria" && !espacos.some((sp) => sp.numero.trim()))
        errs.espacos = "Cadastre ao menos 1 espaço";
      if (tipoAnuncio === "franquia" && !franquiaExtra.investimento.trim())
        errs.investimento = "Informe o investimento inicial";
    }
    if (s === 3) {
      if (!form.proprietario_nome.trim()) errs.proprietario_nome = "Nome obrigatório";
      if (form.proprietario_email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.proprietario_email))
        errs.proprietario_email = "E-mail inválido";
    }
    setErrors((prev) => ({ ...prev, ...errs }));
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step + 1 === 2 ? 1 : step)) {
      // step 1 não tem validação obrigatória — sempre avança
      setStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s));
      // scroll to top do modal
      setTimeout(() => document.getElementById("modal-scroll-top")?.scrollIntoView({ behavior: "smooth" }), 0);
    }
  };
  const handleBack = () => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s));

  const STEP_META = [
    { n: 1, label: "Tipo & Foto" },
    { n: 2, label: "Detalhes" },
    { n: 3, label: "Valores & Contato" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch sm:items-start sm:justify-center bg-black/50 backdrop-blur-sm overflow-y-auto sm:py-6 sm:px-4"
      onClick={handleBackdrop}
    >
      <div id="modal-scroll-top" className="relative w-full max-w-2xl bg-card shadow-2xl min-h-full sm:min-h-0 sm:rounded-2xl sm:border sm:border-border flex flex-col">
        {/* Modal Header — fica sticky com progress bar */}
        <div className="sticky top-0 z-10 bg-card border-b border-border sm:rounded-t-2xl">
          <div className="flex items-center justify-between px-5 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-base sm:text-lg font-bold text-foreground truncate">
                  Novo {TIPO_META[tipoAnuncio].label}
                </h2>
                <p className="text-xs text-muted-foreground">Passo {step} de 3 · {STEP_META[step-1].label}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
            >
            <X className="h-4 w-4" />
          </button>
          </div>

          {/* Progress bar dos 3 passos */}
          <div className="px-5 sm:px-6 pb-4">
            <div className="flex items-center gap-2">
              {STEP_META.map(({ n, label }, idx) => {
                const done = step > n;
                const active = step === n;
                return (
                  <div key={n} className="flex-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => done && setStep(n as 1 | 2 | 3)}
                      disabled={!done}
                      className={`flex items-center gap-2 ${done ? "cursor-pointer" : "cursor-default"}`}
                    >
                      <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                        active ? "bg-primary text-primary-foreground" :
                        done   ? "bg-green-500 text-white" :
                                 "bg-muted text-muted-foreground"
                      }`}>
                        {done ? "✓" : n}
                      </div>
                      <span className={`hidden sm:inline text-xs font-medium ${
                        active ? "text-foreground" : "text-muted-foreground"
                      }`}>{label}</span>
                    </button>
                    {idx < STEP_META.length - 1 && (
                      <div className={`h-0.5 flex-1 rounded-full ${done ? "bg-green-500" : "bg-muted"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 p-5 sm:p-6 space-y-6">
          {errors.submit && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errors.submit}
            </div>
          )}

          {/* ═══════════════ STEP 1: Tipo & Foto ═══════════════ */}
          {step === 1 && (<>
          {/* Tipo de anúncio */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Tipo de anúncio</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(TIPO_META) as TipoAnuncio[]).map((t) => {
                const meta = TIPO_META[t];
                const Icon = meta.icon;
                const active = tipoAnuncio === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipoAnuncio(t)}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-colors ${
                      active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="text-xs font-semibold text-foreground">{meta.label}</div>
                    <div className="text-[10px] text-muted-foreground leading-tight">{meta.descricao}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Aviso pro corretor (quando hideStatusSelector) — explica que vai como pendente */}
          {hideStatusSelector && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800">
                <strong>Seu cadastro vai como Pendente</strong> — o admin precisa aprovar antes de aparecer no site.
                Você acompanha o status na sua lista <strong>Meus Negócios</strong>.
              </div>
            </div>
          )}

          {/* Status (admin pode definir direto; corretor não vê — vai como pendente) */}
          {!hideStatusSelector && (
          <div className="rounded-lg bg-muted/40 border border-border p-4 flex items-center gap-4">
            <div className="flex-1">
              <Label className="text-sm font-semibold">Status inicial</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Como admin, você pode publicar direto como "Ativo"
              </p>
            </div>
            <Select
              value={form.status}
              onValueChange={(v) => setForm((prev) => ({ ...prev, status: v as Negocio["status"] }))}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">✅ Ativo</SelectItem>
                <SelectItem value="pendente">⏳ Pendente</SelectItem>
                <SelectItem value="rejeitado">❌ Rejeitado</SelectItem>
                <SelectItem value="vendido">🏆 Vendido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          )}

          {/* Fotos do Negócio (até 6) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold text-foreground text-sm">
                <Camera className="h-4 w-4 text-primary" />
                Fotos
                <span className="text-xs font-normal text-muted-foreground">
                  ({pendingPhotos.length}/{MAX_FOTOS} · 1ª é a capa)
                </span>
              </h3>
              {pendingPhotos.length < MAX_FOTOS && (
                <button
                  type="button"
                  onClick={() => fotoInputRef.current?.click()}
                  className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-3 w-3" /> Adicionar
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {pendingPhotos.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted group"
                >
                  <img src={photoPreviews[idx]} alt={`foto ${idx + 1}`} className="w-full h-full object-cover" />
                  {idx === 0 && (
                    <span className="absolute top-1 left-1 rounded bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5">
                      CAPA
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-end p-1 gap-1 opacity-0 group-hover:opacity-100">
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => movePhotoToFirst(idx)}
                        className="rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-foreground hover:bg-white"
                        title="Tornar capa"
                      >
                        ⭐
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-destructive hover:bg-white"
                      title="Remover"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}

              {pendingPhotos.length === 0 && (
                <button
                  type="button"
                  onClick={() => fotoInputRef.current?.click()}
                  className="col-span-3 md:col-span-6 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors aspect-[16/5] text-muted-foreground"
                >
                  <ImageIcon className="h-8 w-8 opacity-30" />
                  <p className="text-sm font-medium">Clique para adicionar fotos</p>
                  <p className="text-xs opacity-60">Até 6 imagens · JPG/PNG · 1200×800 recomendado</p>
                </button>
              )}
            </div>

            <input
              ref={fotoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFotosSelect}
            />
          </div>

          {/* Legendas sobre a foto principal */}
          <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-foreground text-sm">
                <Sparkles className="h-4 w-4 text-violet-600" />
                Legendas sobre a foto
                <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Aparecem sobrepostas na foto principal — destacam seu anúncio na busca.
              </p>
            </div>

            <div>
              <Label className="text-xs font-medium">Etiqueta principal (canto superior esquerdo)</Label>
              <Input
                value={form.badge_texto}
                onChange={(e) => setForm((p) => ({ ...p, badge_texto: e.target.value.slice(0, 20) }))}
                placeholder="Ex: LOCAÇÃO, PROMOÇÃO, OPORTUNIDADE…"
                className="mt-1.5"
                maxLength={20}
              />
              <div className="mt-2 flex flex-wrap gap-1">
                {BADGE_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, badge_texto: p }))}
                    className="rounded-full bg-card border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {form.badge_texto && (
              <div>
                <Label className="text-xs font-medium">Cor da etiqueta</Label>
                <div className="mt-1.5 flex gap-2 flex-wrap">
                  {BADGE_CORES.map((c) => (
                    <button
                      key={c.v}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, badge_cor: c.v }))}
                      className={`flex items-center gap-1.5 rounded-lg border-2 px-2.5 py-1 text-xs font-medium transition-colors ${
                        form.badge_cor === c.v ? "border-foreground" : "border-transparent"
                      }`}
                      title={c.label}
                    >
                      <span className={`h-4 w-4 rounded-sm ${c.cls}`} />
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={form.mostrar_preco_foto}
                onChange={(e) => setForm((p) => ({ ...p, mostrar_preco_foto: e.target.checked }))}
              />
              <span>Mostrar <strong>preço</strong> em destaque sobre a foto (canto inferior direito)</span>
            </label>

            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={form.destaque}
                onChange={(e) => setForm((p) => ({ ...p, destaque: e.target.checked }))}
              />
              <span>⭐ Marcar como <strong>Destaque</strong> (aparece no topo da home e ganha selo "Destaque" no card)</span>
            </label>

            {/* Preview */}
            {(form.badge_texto || form.mostrar_preco_foto) && pendingPhotos[0] && (
              <div>
                <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Pré-visualização</p>
                <ImagemComLegenda
                  src={photoPreviews[0]}
                  alt="preview"
                  className="rounded-xl overflow-hidden border border-border"
                  imgClassName="w-full h-40 object-cover"
                  badgeTexto={form.badge_texto}
                  badgeCor={form.badge_cor}
                  mostrarPreco={form.mostrar_preco_foto}
                  preco={form.preco ? Number(form.preco) : undefined}
                />
              </div>
            )}
          </div>

          </>)}

          {/* ════════ STEP 2: Detalhes ════════ */}
          {step === 2 && (<>
          {/* Sobre o Negócio */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 font-semibold text-foreground text-sm">
              <Building2 className="h-4 w-4 text-primary" />
              Sobre o Negócio
            </h3>

            <div>
              <Label htmlFor="m-titulo">Título / Nome *</Label>
              <Input
                id="m-titulo"
                name="titulo"
                value={form.titulo}
                onChange={handleChange}
                placeholder="Ex: Pizzaria Tradicional em Ponto Nobre"
                className={`mt-1.5 ${errors.titulo ? "border-destructive" : ""}`}
              />
              {errors.titulo && <p className="mt-1 text-xs text-destructive">{errors.titulo}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {tipoAnuncio !== "galeria" && (
                <div>
                  <Label>Categoria *</Label>
                  <Select
                    value={form.categoria}
                    onValueChange={(v) => {
                      setForm((p) => ({ ...p, categoria: v }));
                      if (errors.categoria) setErrors((p) => ({ ...p, categoria: "" }));
                    }}
                  >
                    <SelectTrigger className={`mt-1.5 ${errors.categoria ? "border-destructive" : ""}`}>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.categoria && <p className="mt-1 text-xs text-destructive">{errors.categoria}</p>}
                </div>
              )}

              <div>
                <Label htmlFor="m-area">Área total (m²)</Label>
                <div className="relative mt-1.5">
                  <Ruler className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="m-area"
                    name="area_m2"
                    type="number"
                    value={form.area_m2}
                    onChange={handleChange}
                    placeholder="150"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="m-area-venda">Área de venda (m²)</Label>
                <div className="relative mt-1.5">
                  <Ruler className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="m-area-venda" name="area_venda" type="number" value={form.area_venda} onChange={handleChange} placeholder="ex: 500" className="pl-10" />
                </div>
              </div>
              <div>
                <Label htmlFor="m-area-estoque">Área de estoque (m²)</Label>
                <div className="relative mt-1.5">
                  <Ruler className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="m-area-estoque" name="area_estoque" type="number" value={form.area_estoque} onChange={handleChange} placeholder="ex: 500" className="pl-10" />
                </div>
              </div>
            </div>

            {/* IMÓVEL — tipo de imóvel + operação venda/locação */}
            {tipoAnuncio === "imovel" && (
              <div className="grid gap-4 sm:grid-cols-2 rounded-lg border border-blue-200 bg-blue-50/40 p-4">
                <div>
                  <Label>Tipo de imóvel *</Label>
                  <Input
                    value={imovelExtra.tipo_imovel}
                    onChange={(e) => {
                      setImovelExtra((p) => ({ ...p, tipo_imovel: e.target.value }));
                      if (errors.tipo_imovel) setErrors((p) => ({ ...p, tipo_imovel: "" }));
                    }}
                    placeholder="Loja, Sala, Galpão, Prédio..."
                    className={`mt-1.5 ${errors.tipo_imovel ? "border-destructive" : ""}`}
                  />
                  {errors.tipo_imovel && <p className="mt-1 text-xs text-destructive">{errors.tipo_imovel}</p>}
                </div>
                <div>
                  <Label>Operação</Label>
                  <Select
                    value={imovelExtra.operacao}
                    onValueChange={(v) => setImovelExtra((p) => ({ ...p, operacao: v as "venda" | "locacao" | "ambos" }))}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="venda">Venda</SelectItem>
                      <SelectItem value="locacao">Locação</SelectItem>
                      <SelectItem value="ambos">Venda e Locação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* GALERIA — modalidade + lista de espaços */}
            {tipoAnuncio === "galeria" && (
              <div className="space-y-4 rounded-lg border border-violet-200 bg-violet-50/40 p-4">
                <div>
                  <Label>Modalidade do anúncio</Label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button"
                      onClick={() => setGaleriaModalidade("locacao")}
                      className={`rounded-xl border-2 p-2 text-left text-xs transition-colors ${
                        galeriaModalidade === "locacao" ? "border-primary bg-primary/5" : "border-border"
                      }`}>
                      <div className="font-semibold">Locação de espaços</div>
                      <div className="text-muted-foreground mt-0.5">Atrair lojistas/locatários</div>
                    </button>
                    <button type="button"
                      onClick={() => setGaleriaModalidade("venda")}
                      className={`rounded-xl border-2 p-2 text-left text-xs transition-colors ${
                        galeriaModalidade === "venda" ? "border-primary bg-primary/5" : "border-border"
                      }`}>
                      <div className="font-semibold">Venda da galeria</div>
                      <div className="text-muted-foreground mt-0.5">Vender o imóvel inteiro</div>
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Espaços da galeria *</Label>
                    <button
                      type="button"
                      onClick={() => setEspacos((prev) => [...prev, { ...EMPTY_ESPACO }])}
                      className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      <Plus className="h-3 w-3" /> Adicionar espaço
                    </button>
                  </div>
                  {errors.espacos && <p className="mb-2 text-xs text-destructive">{errors.espacos}</p>}
                  <div className="space-y-3">
                    {espacos.map((esp, idx) => (
                      <div key={idx} className="rounded-lg border border-border bg-card p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-foreground">Espaço {idx + 1}</span>
                          {espacos.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setEspacos((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-muted-foreground hover:text-destructive"
                              title="Remover"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <Textarea
                          placeholder="Descrição do espaço (ex: Loja de esquina com vitrine dupla, alto fluxo no corredor principal...)"
                          rows={2}
                          value={esp.descricao}
                          onChange={(e) => {
                            const v = e.target.value;
                            setEspacos((prev) => prev.map((s, i) => i === idx ? { ...s, descricao: v } : s));
                          }}
                          className="mb-2 text-sm"
                        />
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <Input
                            placeholder="Número (ex: 12)"
                            value={esp.numero}
                            onChange={(e) => {
                              const v = e.target.value;
                              setEspacos((prev) => prev.map((s, i) => i === idx ? { ...s, numero: v } : s));
                            }}
                          />
                          <Input
                            placeholder="Tipo (Loja, Sala)"
                            value={esp.tipo}
                            onChange={(e) => {
                              const v = e.target.value;
                              setEspacos((prev) => prev.map((s, i) => i === idx ? { ...s, tipo: v } : s));
                            }}
                          />
                          <Input
                            placeholder="Andar (Térreo, 1)"
                            value={esp.andar}
                            onChange={(e) => {
                              const v = e.target.value;
                              setEspacos((prev) => prev.map((s, i) => i === idx ? { ...s, andar: v } : s));
                            }}
                          />
                          <Input
                            type="number" placeholder="Área m²"
                            value={esp.area_m2}
                            onChange={(e) => {
                              const v = e.target.value;
                              setEspacos((prev) => prev.map((s, i) => i === idx ? { ...s, area_m2: v } : s));
                            }}
                          />
                          <Input
                            type="number" placeholder="R$ aluguel"
                            value={esp.valor_aluguel}
                            onChange={(e) => {
                              const v = e.target.value;
                              setEspacos((prev) => prev.map((s, i) => i === idx ? { ...s, valor_aluguel: v } : s));
                            }}
                          />
                          <label className="flex items-center gap-2 text-xs text-foreground">
                            <input
                              type="checkbox"
                              checked={esp.disponivel}
                              onChange={(e) => {
                                const v = e.target.checked;
                                setEspacos((prev) => prev.map((s, i) => i === idx ? { ...s, disponivel: v } : s));
                              }}
                            />
                            Disponível
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* FRANQUIA — investimento, taxa, royalties */}
            {tipoAnuncio === "franquia" && (
              <div className="grid gap-4 sm:grid-cols-3 rounded-lg border border-amber-200 bg-amber-50/40 p-4">
                <div>
                  <Label>Investimento inicial (R$) *</Label>
                  <Input
                    type="number"
                    value={franquiaExtra.investimento}
                    onChange={(e) => {
                      setFranquiaExtra((p) => ({ ...p, investimento: e.target.value }));
                      if (errors.investimento) setErrors((p) => ({ ...p, investimento: "" }));
                    }}
                    placeholder="150000"
                    className={`mt-1.5 ${errors.investimento ? "border-destructive" : ""}`}
                  />
                  {errors.investimento && <p className="mt-1 text-xs text-destructive">{errors.investimento}</p>}
                </div>
                <div>
                  <Label>Taxa de franquia (R$)</Label>
                  <Input
                    type="number"
                    value={franquiaExtra.taxa_franquia}
                    onChange={(e) => setFranquiaExtra((p) => ({ ...p, taxa_franquia: e.target.value }))}
                    placeholder="40000"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Royalties (% / fixo)</Label>
                  <Input
                    value={franquiaExtra.royalties}
                    onChange={(e) => setFranquiaExtra((p) => ({ ...p, royalties: e.target.value }))}
                    placeholder="5% ou R$ 2.500/mês"
                    className="mt-1.5"
                  />
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="m-cidade">Cidade *</Label>
                <div className="relative mt-1.5">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="m-cidade"
                    name="cidade"
                    value={form.cidade}
                    onChange={handleChange}
                    placeholder="São Paulo"
                    className={`pl-10 ${errors.cidade ? "border-destructive" : ""}`}
                  />
                </div>
                {errors.cidade && <p className="mt-1 text-xs text-destructive">{errors.cidade}</p>}
              </div>

              <div>
                <Label>Estado *</Label>
                <Select
                  value={form.estado}
                  onValueChange={(v) => {
                    setForm((p) => ({ ...p, estado: v }));
                    if (errors.estado) setErrors((p) => ({ ...p, estado: "" }));
                  }}
                >
                  <SelectTrigger className={`mt-1.5 ${errors.estado ? "border-destructive" : ""}`}>
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.estado && <p className="mt-1 text-xs text-destructive">{errors.estado}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="m-bairro">Bairro / Região</Label>
              <div className="relative mt-1.5">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="m-bairro"
                  name="bairro"
                  value={form.bairro}
                  onChange={handleChange}
                  placeholder="Ex: Pinheiros, Moema, Centro..."
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="m-desc">Descrição *</Label>
                <button
                  type="button"
                  onClick={handleGerarDescricao}
                  disabled={aiLoading || (!form.titulo && !form.categoria)}
                  className="flex items-center gap-1.5 rounded-lg bg-violet-50 border border-violet-200 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors disabled:opacity-40"
                >
                  {aiLoading
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Sparkles className="h-3.5 w-3.5" />}
                  {aiLoading ? "Gerando..." : "Melhorar com IA"}
                </button>
              </div>
              <Textarea
                id="m-desc"
                name="descricao"
                value={form.descricao}
                onChange={handleChange}
                placeholder="Tempo de operação, ponto comercial, equipe, diferenciais, motivo da venda..."
                rows={4}
                className={errors.descricao ? "border-destructive" : ""}
              />
              {errors.descricao && <p className="mt-1 text-xs text-destructive">{errors.descricao}</p>}
            </div>
          </div>

          </>)}

          {/* ════════ STEP 3: Valores & Contato ════════ */}
          {step === 3 && (<>
          {/* Financeiro */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 font-semibold text-foreground text-sm">
              <DollarSign className="h-4 w-4 text-green-600" />
              Informações Financeiras
              <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="m-preco">Valor Pedido (R$)</Label>
                <div className="relative mt-1.5">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="m-preco"
                    name="preco"
                    type="number"
                    value={form.preco}
                    onChange={handleChange}
                    placeholder="350000"
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="m-fat">Faturamento Mensal (R$)</Label>
                <div className="relative mt-1.5">
                  <TrendingUp className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="m-fat"
                    name="faturamento_mensal"
                    type="number"
                    value={form.faturamento_mensal}
                    onChange={handleChange}
                    placeholder="45000"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Atribuir corretor (somente admin — corretorId vem fixo quando é o próprio corretor) */}
          {!corretorId && (
            <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <h3 className="flex items-center gap-2 font-semibold text-foreground text-sm">
                <UserCheck2 className="h-4 w-4 text-primary" />
                Atribuir a um corretor
              </h3>
              <p className="text-xs text-muted-foreground">
                O corretor escolhido verá este anúncio em "Meus Negócios" e poderá editá-lo.
              </p>
              <Select
                value={selectedCorretor || "_none"}
                onValueChange={(v) => setSelectedCorretor(v === "_none" ? "" : v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Nenhum (sem corretor)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Nenhum (sem corretor)</SelectItem>
                  {corretores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Proprietário */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 font-semibold text-foreground text-sm">
              <User className="h-4 w-4 text-primary" />
              Dados do Proprietário
            </h3>

            <div>
              <Label htmlFor="m-prop-nome">Nome Completo *</Label>
              <div className="relative mt-1.5">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="m-prop-nome"
                  name="proprietario_nome"
                  value={form.proprietario_nome}
                  onChange={handleChange}
                  placeholder="Nome do proprietário"
                  className={`pl-10 ${errors.proprietario_nome ? "border-destructive" : ""}`}
                />
              </div>
              {errors.proprietario_nome && <p className="mt-1 text-xs text-destructive">{errors.proprietario_nome}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="m-prop-email">E-mail *</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="m-prop-email"
                    name="proprietario_email"
                    type="email"
                    value={form.proprietario_email}
                    onChange={handleChange}
                    placeholder="proprietario@email.com"
                    className={`pl-10 ${errors.proprietario_email ? "border-destructive" : ""}`}
                  />
                </div>
                {errors.proprietario_email && <p className="mt-1 text-xs text-destructive">{errors.proprietario_email}</p>}
              </div>
              <div>
                <Label htmlFor="m-prop-tel">WhatsApp / Telefone</Label>
                <div className="relative mt-1.5">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="m-prop-tel"
                    name="proprietario_telefone"
                    value={form.proprietario_telefone}
                    onChange={handleChange}
                    placeholder="(11) 99999-9999"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          </>)}
        </form>

        {/* Footer Wizard — sticky no rodapé com Voltar/Avançar/Salvar */}
        <div className="sticky bottom-0 z-10 border-t border-border bg-card px-5 py-3 sm:px-6 sm:py-4 sm:rounded-b-2xl flex items-center justify-between gap-2 safe-area-bottom">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={handleBack} disabled={saving} className="gap-2">
              <ChevronLeft className="h-4 w-4" /> Voltar
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving} className="text-muted-foreground">
              Cancelar
            </Button>
          )}
          {step < 3 ? (
            <Button type="button" onClick={handleNext} className="gap-2">
              Avançar <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
              className="gap-2"
              disabled={saving}
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</>
              ) : (
                <><Save className="h-4 w-4" />Salvar {TIPO_META[tipoAnuncio].label}</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Edit Negocio Modal ───────────────────────────────────────────────────────

interface EditNegocioModalProps {
  negocio: Negocio;
  onClose: () => void;
  onSaved: (negocio: Negocio) => void;
}

export const EditNegocioModal = ({ negocio, onClose, onSaved }: EditNegocioModalProps) => {
  const negocioAny = negocio as Negocio & {
    badge_texto?: string | null;
    badge_cor?: "green" | "blue" | "red" | "amber" | "violet" | "slate" | null;
    mostrar_preco_foto?: boolean;
  };
  const [form, setForm] = useState({
    titulo: negocio.titulo,
    categoria: normalizeCategoria(negocio.categoria),
    cidade: negocio.cidade,
    estado: negocio.estado,
    bairro: (negocio as Negocio & { bairro?: string | null }).bairro ?? "",
    preco: negocio.preco?.toString() ?? "",
    faturamento_mensal: negocio.faturamento_mensal?.toString() ?? "",
    area_m2: negocio.area_m2?.toString() ?? "",
    area_venda: (negocio as Negocio & { area_venda?: number | null }).area_venda?.toString() ?? "",
    area_estoque: (negocio as Negocio & { area_estoque?: number | null }).area_estoque?.toString() ?? "",
    descricao: negocio.descricao ?? "",
    proprietario_nome: negocio.proprietario_nome,
    proprietario_telefone: negocio.proprietario_telefone ?? "",
    proprietario_email: negocio.proprietario_email,
    status: negocio.status,
    badge_texto: negocioAny.badge_texto ?? "",
    badge_cor: (negocioAny.badge_cor ?? "green") as "green" | "blue" | "red" | "amber" | "violet" | "slate",
    mostrar_preco_foto: negocioAny.mostrar_preco_foto ?? false,
    destaque: negocioAny.destaque ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Atribuição de corretor
  const [corretores, setCorretores] = useState<{ id: string; nome: string }[]>([]);
  const [selectedCorretor, setSelectedCorretor] = useState<string>(
    (negocio as Negocio & { corretor_id?: string | null }).corretor_id ?? ""
  );
  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, nome")
      .eq("role", "corretor")
      .eq("ativo", true)
      .order("nome")
      .then(({ data }) => setCorretores((data as { id: string; nome: string }[]) || []));
  }, []);
  const MAX_FOTOS_EDIT = 6;
  // URLs já salvas no banco + arquivos pendentes pra upload
  const initialUrls = (() => {
    const n = negocioAny as Negocio & { imagens?: string[] | null; imagem?: string };
    if (Array.isArray(n.imagens) && n.imagens.length > 0) return n.imagens.filter(Boolean);
    if (n.imagem) return [n.imagem];
    if (n.foto_url) return [n.foto_url]; // fallback pro alias antigo em memória
    return [];
  })();
  const [photoUrls, setPhotoUrls] = useState<string[]>(initialUrls);
  const [photoUploads, setPhotoUploads] = useState<File[]>([]);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  // foto principal pra preview de legenda (primeira)
  const previewMainUrl = photoUploads[0] ? URL.createObjectURL(photoUploads[0]) : photoUrls[0];

  const handleFotosSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const total = photoUrls.length + photoUploads.length;
    const acceptable = files.slice(0, Math.max(0, MAX_FOTOS_EDIT - total));
    setPhotoUploads((prev) => [...prev, ...acceptable]);
    if (e.target) e.target.value = "";
  };

  const removePhotoUrl = (idx: number) => setPhotoUrls((prev) => prev.filter((_, i) => i !== idx));
  const removePhotoUpload = (idx: number) => setPhotoUploads((prev) => prev.filter((_, i) => i !== idx));
  const movePhotoUrlToFirst = (idx: number) => {
    setPhotoUrls((prev) => {
      if (idx <= 0 || idx >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.unshift(item);
      return copy;
    });
  };
  const movePhotoUploadToFirst = (idx: number) => {
    setPhotoUploads((prev) => {
      if (idx <= 0 || idx >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.unshift(item);
      return copy;
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.titulo.trim()) e.titulo = "Título é obrigatório";
    if (!form.cidade.trim()) e.cidade = "Cidade é obrigatória";
    if (!form.estado) e.estado = "Selecione o estado";
    if (!form.proprietario_nome.trim()) e.proprietario_nome = "Nome é obrigatório";
    if (form.proprietario_email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.proprietario_email))
      e.proprietario_email = "E-mail inválido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);

    // 1) Upload das fotos novas
    let finalUrls = [...photoUrls];
    if (photoUploads.length > 0) {
      setUploadingFoto(true);
      for (let i = 0; i < photoUploads.length; i++) {
        const file = photoUploads[i];
        const ext = (file.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
        const path = `negocios/${negocio.id}-${Date.now()}-${i}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("lead-images")
          .upload(path, file, { upsert: true, contentType: file.type });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("lead-images").getPublicUrl(path);
          finalUrls.push(urlData.publicUrl);
        }
      }
      setUploadingFoto(false);
    }
    finalUrls = finalUrls.slice(0, MAX_FOTOS_EDIT);

    const fields = {
      titulo: form.titulo,
      categoria: form.categoria,
      cidade: form.cidade,
      estado: form.estado,
      bairro: form.bairro || null,
      preco: form.preco ? Number(form.preco) : undefined,
      faturamento_mensal: form.faturamento_mensal ? Number(form.faturamento_mensal) : undefined,
      area_m2: form.area_m2 ? Number(form.area_m2) : undefined,
      area_venda: form.area_venda ? Number(form.area_venda) : null,
      area_estoque: form.area_estoque ? Number(form.area_estoque) : null,
      descricao: form.descricao,
      proprietario_nome: form.proprietario_nome,
      proprietario_telefone: form.proprietario_telefone || undefined,
      proprietario_email: form.proprietario_email,
      status: form.status,
      badge_texto: form.badge_texto.trim() || null,
      badge_cor: form.badge_cor,
      mostrar_preco_foto: form.mostrar_preco_foto,
      destaque: form.destaque,
      corretor_id: selectedCorretor || null,
      // Persiste as URLs (1ª = capa)
      imagem: finalUrls[0] || null,
      imagens: finalUrls,
    } as Partial<Negocio> & { imagem?: string | null; imagens?: string[]; corretor_id?: string | null };

    const result = await updateNegocio(negocio.id, fields);
    setSaving(false);

    if (!result.ok) {
      setErrors({ submit: result.error || "Erro ao salvar. Tente novamente." });
      return;
    }
    onSaved({ ...negocio, ...fields } as Negocio);
  };

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch sm:items-start sm:justify-center bg-black/50 backdrop-blur-sm overflow-y-auto sm:py-6 sm:px-4"
      onClick={handleBackdrop}
    >
      <div className="relative w-full max-w-2xl bg-card shadow-2xl min-h-full sm:min-h-0 sm:rounded-2xl sm:border sm:border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Pencil className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">Editar Negócio</h2>
              <p className="text-xs text-muted-foreground line-clamp-1">{negocio.titulo}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errors.submit && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errors.submit}
            </div>
          )}

          {/* Status */}
          <div className="rounded-lg bg-muted/40 border border-border p-4 flex items-center gap-4">
            <div className="flex-1">
              <Label className="text-sm font-semibold">Status</Label>
            </div>
            <Select
              value={form.status}
              onValueChange={(v) => setForm((prev) => ({ ...prev, status: v as Negocio["status"] }))}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">✅ Ativo</SelectItem>
                <SelectItem value="pendente">⏳ Pendente</SelectItem>
                <SelectItem value="rejeitado">❌ Rejeitado</SelectItem>
                <SelectItem value="vendido">🏆 Vendido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fotos do Negócio (até 6) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold text-foreground text-sm">
                <Camera className="h-4 w-4 text-primary" />
                Fotos
                <span className="text-xs font-normal text-muted-foreground">
                  ({photoUrls.length + photoUploads.length}/{MAX_FOTOS_EDIT} · 1ª é a capa)
                </span>
              </h3>
              {photoUrls.length + photoUploads.length < MAX_FOTOS_EDIT && (
                <button
                  type="button"
                  onClick={() => fotoInputRef.current?.click()}
                  className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-3 w-3" /> Adicionar
                </button>
              )}
            </div>

            {uploadingFoto && (
              <div className="rounded-lg border border-border bg-muted p-2 text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando fotos...
              </div>
            )}

            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {/* URLs já salvas */}
              {photoUrls.map((url, idx) => (
                <div key={`url-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted group">
                  <img src={url} alt={`foto ${idx + 1}`} className="w-full h-full object-cover" />
                  {idx === 0 && photoUploads.length === 0 && (
                    <span className="absolute top-1 left-1 rounded bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5">CAPA</span>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-end p-1 gap-1 opacity-0 group-hover:opacity-100">
                    {idx > 0 && (
                      <button type="button" onClick={() => movePhotoUrlToFirst(idx)}
                        className="rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-foreground hover:bg-white" title="Tornar capa">⭐</button>
                    )}
                    <button type="button" onClick={() => removePhotoUrl(idx)}
                      className="rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-destructive hover:bg-white" title="Remover">✕</button>
                  </div>
                </div>
              ))}

              {/* Uploads novos pendentes */}
              {photoUploads.map((file, idx) => {
                const previewUrl = URL.createObjectURL(file);
                const isCapa = photoUrls.length === 0 && idx === 0;
                return (
                  <div key={`new-${idx}-${file.name}`} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted group">
                    <img src={previewUrl} alt={`nova ${idx + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute top-1 right-1 rounded bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5">NOVA</span>
                    {isCapa && (
                      <span className="absolute top-1 left-1 rounded bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5">CAPA</span>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-end p-1 gap-1 opacity-0 group-hover:opacity-100">
                      {idx > 0 && (
                        <button type="button" onClick={() => movePhotoUploadToFirst(idx)}
                          className="rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-foreground hover:bg-white" title="Tornar capa">⭐</button>
                      )}
                      <button type="button" onClick={() => removePhotoUpload(idx)}
                        className="rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-destructive hover:bg-white" title="Remover">✕</button>
                    </div>
                  </div>
                );
              })}

              {photoUrls.length === 0 && photoUploads.length === 0 && (
                <button
                  type="button"
                  onClick={() => fotoInputRef.current?.click()}
                  className="col-span-3 md:col-span-6 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors aspect-[16/5] text-muted-foreground"
                >
                  <ImageIcon className="h-8 w-8 opacity-30" />
                  <p className="text-sm font-medium">Clique para adicionar fotos</p>
                  <p className="text-xs opacity-60">Até 6 imagens · JPG/PNG · 1200×800 recomendado</p>
                </button>
              )}
            </div>

            <input
              ref={fotoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFotosSelect}
            />
          </div>

          {/* Legendas sobre a foto principal */}
          <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-foreground text-sm">
                <Sparkles className="h-4 w-4 text-violet-600" />
                Legendas sobre a foto
                <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Etiqueta colorida + preço em destaque sobre a foto — chama atenção na busca.
              </p>
            </div>

            <div>
              <Label className="text-xs font-medium">Etiqueta principal (canto superior esquerdo)</Label>
              <Input
                value={form.badge_texto}
                onChange={(e) => setForm((p) => ({ ...p, badge_texto: e.target.value.slice(0, 20) }))}
                placeholder="Ex: LOCAÇÃO, PROMOÇÃO, OPORTUNIDADE…"
                className="mt-1.5"
                maxLength={20}
              />
              <div className="mt-2 flex flex-wrap gap-1">
                {BADGE_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, badge_texto: p }))}
                    className="rounded-full bg-card border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {form.badge_texto && (
              <div>
                <Label className="text-xs font-medium">Cor da etiqueta</Label>
                <div className="mt-1.5 flex gap-2 flex-wrap">
                  {BADGE_CORES.map((c) => (
                    <button
                      key={c.v}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, badge_cor: c.v }))}
                      className={`flex items-center gap-1.5 rounded-lg border-2 px-2.5 py-1 text-xs font-medium transition-colors ${
                        form.badge_cor === c.v ? "border-foreground" : "border-transparent"
                      }`}
                      title={c.label}
                    >
                      <span className={`h-4 w-4 rounded-sm ${c.cls}`} />
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={form.mostrar_preco_foto}
                onChange={(e) => setForm((p) => ({ ...p, mostrar_preco_foto: e.target.checked }))}
              />
              <span>Mostrar <strong>preço</strong> em destaque sobre a foto (canto inferior direito)</span>
            </label>

            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={form.destaque}
                onChange={(e) => setForm((p) => ({ ...p, destaque: e.target.checked }))}
              />
              <span>⭐ Marcar como <strong>Destaque</strong> (aparece no topo da home e ganha selo "Destaque" no card)</span>
            </label>

            {/* Preview ao vivo */}
            {(form.badge_texto || form.mostrar_preco_foto) && previewMainUrl && (
              <div>
                <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Pré-visualização</p>
                <ImagemComLegenda
                  src={previewMainUrl}
                  alt="preview"
                  className="rounded-xl overflow-hidden border border-border"
                  imgClassName="w-full h-40 object-cover"
                  badgeTexto={form.badge_texto}
                  badgeCor={form.badge_cor}
                  mostrarPreco={form.mostrar_preco_foto}
                  preco={form.preco ? Number(form.preco) : undefined}
                />
              </div>
            )}
          </div>

          {/* Sobre o Negócio */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 font-semibold text-foreground text-sm">
              <Building2 className="h-4 w-4 text-primary" />
              Sobre o Negócio
            </h3>
            <div>
              <Label htmlFor="e-titulo">Título / Nome *</Label>
              <Input id="e-titulo" name="titulo" value={form.titulo} onChange={handleChange}
                className={`mt-1.5 ${errors.titulo ? "border-destructive" : ""}`} />
              {errors.titulo && <p className="mt-1 text-xs text-destructive">{errors.titulo}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Categoria *</Label>
                <Select value={form.categoria} onValueChange={(v) => setForm((p) => ({ ...p, categoria: v }))}>
                  <SelectTrigger className={`mt-1.5 ${errors.categoria ? "border-destructive" : ""}`}>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.categoria && <p className="mt-1 text-xs text-destructive">{errors.categoria}</p>}
              </div>
              <div>
                <Label htmlFor="e-area">Área total (m²)</Label>
                <div className="relative mt-1.5">
                  <Ruler className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="e-area" name="area_m2" type="number" value={form.area_m2} onChange={handleChange} placeholder="150" className="pl-10" />
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="e-area-venda">Área de venda (m²)</Label>
                <div className="relative mt-1.5">
                  <Ruler className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="e-area-venda" name="area_venda" type="number" value={form.area_venda} onChange={handleChange} placeholder="ex: 500" className="pl-10" />
                </div>
              </div>
              <div>
                <Label htmlFor="e-area-estoque">Área de estoque (m²)</Label>
                <div className="relative mt-1.5">
                  <Ruler className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="e-area-estoque" name="area_estoque" type="number" value={form.area_estoque} onChange={handleChange} placeholder="ex: 500" className="pl-10" />
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="e-cidade">Cidade *</Label>
                <div className="relative mt-1.5">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="e-cidade" name="cidade" value={form.cidade} onChange={handleChange}
                    className={`pl-10 ${errors.cidade ? "border-destructive" : ""}`} />
                </div>
                {errors.cidade && <p className="mt-1 text-xs text-destructive">{errors.cidade}</p>}
              </div>
              <div>
                <Label>Estado *</Label>
                <Select value={form.estado} onValueChange={(v) => setForm((p) => ({ ...p, estado: v }))}>
                  <SelectTrigger className={`mt-1.5 ${errors.estado ? "border-destructive" : ""}`}>
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.estado && <p className="mt-1 text-xs text-destructive">{errors.estado}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="e-bairro">Bairro / Região</Label>
              <div className="relative mt-1.5">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="e-bairro"
                  name="bairro"
                  value={form.bairro}
                  onChange={handleChange}
                  placeholder="Ex: Pinheiros, Moema, Centro..."
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="e-desc">Descrição *</Label>
              <Textarea id="e-desc" name="descricao" value={form.descricao} onChange={handleChange} rows={4}
                className={`mt-1.5 ${errors.descricao ? "border-destructive" : ""}`} />
            </div>
          </div>

          {/* Financeiro */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 font-semibold text-foreground text-sm">
              <DollarSign className="h-4 w-4 text-green-600" />
              Informações Financeiras
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="e-preco">Valor Pedido (R$)</Label>
                <div className="relative mt-1.5">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="e-preco" name="preco" type="number" value={form.preco} onChange={handleChange} placeholder="350000" className="pl-10" />
                </div>
              </div>
              <div>
                <Label htmlFor="e-fat">Faturamento Mensal (R$)</Label>
                <div className="relative mt-1.5">
                  <TrendingUp className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="e-fat" name="faturamento_mensal" type="number" value={form.faturamento_mensal} onChange={handleChange} placeholder="45000" className="pl-10" />
                </div>
              </div>
            </div>
          </div>

          {/* Atribuir corretor */}
          <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <h3 className="flex items-center gap-2 font-semibold text-foreground text-sm">
              <UserCheck2 className="h-4 w-4 text-primary" />
              Corretor responsável
            </h3>
            <p className="text-xs text-muted-foreground">
              O corretor escolhido vê este anúncio em "Meus Negócios" e pode editá-lo.
            </p>
            <Select
              value={selectedCorretor || "_none"}
              onValueChange={(v) => setSelectedCorretor(v === "_none" ? "" : v)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Nenhum (sem corretor)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Nenhum (sem corretor)</SelectItem>
                {corretores.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Proprietário */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 font-semibold text-foreground text-sm">
              <User className="h-4 w-4 text-primary" />
              Dados do Proprietário
            </h3>
            <div>
              <Label htmlFor="e-prop-nome">Nome Completo *</Label>
              <div className="relative mt-1.5">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="e-prop-nome" name="proprietario_nome" value={form.proprietario_nome} onChange={handleChange}
                  className={`pl-10 ${errors.proprietario_nome ? "border-destructive" : ""}`} />
              </div>
              {errors.proprietario_nome && <p className="mt-1 text-xs text-destructive">{errors.proprietario_nome}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="e-prop-email">E-mail *</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="e-prop-email" name="proprietario_email" type="email" value={form.proprietario_email} onChange={handleChange}
                    className={`pl-10 ${errors.proprietario_email ? "border-destructive" : ""}`} />
                </div>
                {errors.proprietario_email && <p className="mt-1 text-xs text-destructive">{errors.proprietario_email}</p>}
              </div>
              <div>
                <Label htmlFor="e-prop-tel">WhatsApp / Telefone</Label>
                <div className="relative mt-1.5">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="e-prop-tel" name="proprietario_telefone" value={form.proprietario_telefone} onChange={handleChange} placeholder="(11) 99999-9999" className="pl-10" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" className="gap-2" disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</> : <><Save className="h-4 w-4" />Salvar Alterações</>}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const AdminNegocios = () => {
  usePageTitle("Admin - Negócios");
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingNegocio, setEditingNegocio] = useState<Negocio | null>(null);
  const [editingGaleriaId, setEditingGaleriaId] = useState<string | null>(null);
  const [shareItem, setShareItem] = useState<Negocio | null>(null);
  const [publishItem, setPublishItem] = useState<Negocio | null>(null);

  useEffect(() => {
    const load = async () => {
      const negociosData = await getAllNegocios();

      // Busca galerias e mescla na mesma lista (mapeadas para shape de Negocio)
      const { data: galeriasData } = await supabase
        .from("galerias")
        .select("id, nome, cidade, estado, endereco, descricao, imagem, status, criado_em, espacos_galeria(count)")
        .order("criado_em", { ascending: false });

      const galeriasMapped: Negocio[] = (galeriasData || []).map((g: {
        id: string; nome: string; cidade: string; estado: string;
        endereco: string; descricao: string | null; imagem: string | null;
        status?: string;
        criado_em: string;
        espacos_galeria?: { count: number }[];
      }) => {
        const qtdEspacos = g.espacos_galeria?.[0]?.count ?? 0;
        return {
          id: g.id,
          titulo: g.nome,
          tipo: "galeria",
          categoria: `Galeria · ${qtdEspacos} espaço(s)`,
          cidade: g.cidade,
          estado: g.estado,
          bairro: g.endereco || null,
          preco: null,
          faturamento_mensal: null,
          area_m2: null,
          descricao: g.descricao || "",
          status: (g.status || "ativo") as Negocio["status"],
          proprietario_nome: "",
          proprietario_telefone: null,
          proprietario_email: "",
          foto_url: g.imagem || null,
          criado_em: g.criado_em,
        } as unknown as Negocio;
      });

      // Mescla e ordena por data desc
      const merged = [...negociosData, ...galeriasMapped].sort(
        (a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
      );

      setNegocios(merged);
      setLoading(false);
    };
    load();
  }, []);

  const handleStatusChange = async (id: string, newStatus: Negocio["status"]) => {
    setUpdating(id);
    // Detecta se é galeria (tem "Galeria ·" na categoria mapeada)
    const item = negocios.find((n) => n.id === id);
    const isGaleria = (item as { tipo?: string })?.tipo === "galeria";
    const ok = isGaleria
      ? !(await supabase.from("galerias").update({ status: newStatus }).eq("id", id)).error
      : await updateNegocioStatus(id, newStatus);
    if (ok) {
      setNegocios((prev) => prev.map((n) => (n.id === id ? { ...n, status: newStatus } : n)));
      if (newStatus === "rejeitado") {
        try { (window as unknown as { sonner?: { toast: (msg: string) => void } }).sonner?.toast("Anúncio rejeitado — não aparece mais no site"); } catch { /* */ }
      }
    }
    setUpdating(null);
  };

  const handleDelete = async (n: Negocio & { _kind?: "negocio" | "galeria" }) => {
    const tipo = (n as { tipo?: string }).tipo;
    const isGaleria = n._kind === "galeria" || tipo === "galeria";
    if (!window.confirm(
      `Excluir permanentemente "${n.titulo}"?\n\n${isGaleria ? "Os espaços vinculados também serão removidos." : ""}\n\nEssa ação não pode ser desfeita.`
    )) return;
    setUpdating(n.id);
    const ok = isGaleria ? await deleteGaleria(n.id) : await deleteNegocio(n.id);
    if (ok) setNegocios((prev) => prev.filter((x) => x.id !== n.id));
    setUpdating(null);
  };

  const handleSaved = (negocio: Negocio) => {
    setNegocios((prev) => [negocio, ...prev]);
    setShowModal(false);
  };

  const handleEdited = (updated: Negocio) => {
    setNegocios((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    setEditingNegocio(null);
  };

  const filtered = negocios.filter((n) => {
    const matchesStatus = statusFilter === "todos" || n.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      n.titulo.toLowerCase().includes(q) ||
      n.categoria.toLowerCase().includes(q) ||
      n.cidade.toLowerCase().includes(q) ||
      n.proprietario_nome.toLowerCase().includes(q) ||
      n.proprietario_email.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const counts = {
    todos: negocios.length,
    rascunho: negocios.filter((n) => n.status === "rascunho").length,
    pendente: negocios.filter((n) => n.status === "pendente").length,
    ativo: negocios.filter((n) => n.status === "ativo").length,
    rejeitado: negocios.filter((n) => n.status === "rejeitado").length,
    vendido: negocios.filter((n) => n.status === "vendido").length,
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* New Modal */}
      {showModal && (
        <NovoNegocioModal
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}

      {/* Edit Modal — negocio/imovel/franquia */}
      {editingNegocio && (
        <EditNegocioModal
          negocio={editingNegocio}
          onClose={() => setEditingNegocio(null)}
          onSaved={handleEdited}
        />
      )}

      {/* Edit Modal — galeria (com espacos) */}
      {editingGaleriaId && (
        <EditGaleriaModal
          galeriaId={editingGaleriaId}
          onClose={() => setEditingGaleriaId(null)}
          onSaved={() => {
            setEditingGaleriaId(null);
            // Recarrega a lista completa pra refletir alterações na galeria/espaços
            setLoading(true);
            (async () => {
              const data = await getAllNegocios();
              const { data: gals } = await supabase
                .from("galerias")
                .select("id, nome, cidade, estado, endereco, descricao, imagem, criado_em, espacos_galeria(count)")
                .order("criado_em", { ascending: false });
              const galeriasMapped: Negocio[] = (gals || []).map((g: {
                id: string; nome: string; cidade: string; estado: string;
                endereco: string; descricao: string | null; imagem: string | null;
                criado_em: string; espacos_galeria?: { count: number }[];
              }) => {
                const qtd = g.espacos_galeria?.[0]?.count ?? 0;
                return {
                  id: g.id, titulo: g.nome, tipo: "galeria",
                  categoria: `Galeria · ${qtd} espaço(s)`,
                  cidade: g.cidade, estado: g.estado, bairro: g.endereco || null,
                  preco: null, faturamento_mensal: null, area_m2: null,
                  descricao: g.descricao || "", status: "ativo",
                  proprietario_nome: "", proprietario_telefone: null, proprietario_email: "",
                  foto_url: g.imagem || null, criado_em: g.criado_em,
                } as unknown as Negocio;
              });
              const merged = [...data, ...galeriasMapped].sort(
                (a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
              );
              setNegocios(merged);
              setLoading(false);
            })();
          }}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Negócios
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os negócios cadastrados na plataforma
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
            {counts.pendente} pendente{counts.pendente !== 1 ? "s" : ""}
          </span>
          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
            {counts.ativo} ativo{counts.ativo !== 1 ? "s" : ""}
          </span>
          <Button onClick={() => setShowModal(true)} className="gap-2 font-semibold">
            <Plus className="h-4 w-4" />
            Novo Negócio
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por título, categoria, cidade ou proprietário..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 border border-border shrink-0 overflow-x-auto">
          <Filter className="h-3.5 w-3.5 text-muted-foreground ml-2 mr-1 shrink-0" />
          {(["todos", "rascunho", "pendente", "ativo", "rejeitado", "vendido"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`whitespace-nowrap px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                statusFilter === s
                  ? "bg-card shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "todos"
                ? `Todos (${counts.todos})`
                : `${STATUS_CONFIG[s as Negocio["status"]].label} (${counts[s]})`}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Building2 className="h-14 w-14 mb-4 opacity-20" />
          <p className="text-lg font-medium">Nenhum negócio encontrado</p>
          <p className="text-sm mt-1">
            {searchQuery
              ? "Tente outros termos de busca"
              : statusFilter !== "todos"
              ? `Sem negócios com status "${STATUS_CONFIG[statusFilter as Negocio["status"]]?.label}"`
              : "Nenhum negócio cadastrado ainda"}
          </p>
          {!searchQuery && statusFilter === "todos" && (
            <Button onClick={() => setShowModal(true)} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Cadastrar primeiro negócio
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((negocio) => {
            const statusCfg = STATUS_CONFIG[negocio.status];
            const isExpanded = expandedId === negocio.id;
            const isUpdating = updating === negocio.id;

            return (
              <div
                key={negocio.id}
                className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
              >
                {/* Card Header */}
                <div className="flex items-start gap-4 p-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-display font-bold text-foreground leading-tight">
                            {negocio.titulo}
                          </h3>
                          {negocio.codigo && (
                            <span className="shrink-0 rounded-md bg-muted border border-border px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
                              NEG-{String(negocio.codigo).padStart(4, "0")}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-1.5">
                          <span className="text-base sm:text-sm text-muted-foreground">{negocio.categoria}</span>
                          <span className="flex items-center gap-1 text-base sm:text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                            {negocio.cidade}, {negocio.estado}
                          </span>
                          <span className="flex items-center gap-1 text-sm sm:text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                            {timeAgo(negocio.criado_em)}
                          </span>
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full border px-3 sm:px-2.5 py-1 sm:py-0.5 text-sm sm:text-xs font-semibold ${statusCfg.bg} ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2.5">
                      {negocio.preco && (
                        <span className="flex items-center gap-1.5 text-base sm:text-sm font-semibold text-foreground">
                          <DollarSign className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-primary" />
                          {formatCurrency(negocio.preco)}
                        </span>
                      )}
                      {negocio.faturamento_mensal && (
                        <span className="flex items-center gap-1.5 text-base sm:text-sm text-muted-foreground">
                          <TrendingUp className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-green-600" />
                          Fatura {formatCurrency(negocio.faturamento_mensal)}/mês
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border/60 pt-3 bg-muted/20">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          Proprietário
                        </p>
                        <p className="font-medium text-foreground text-base sm:text-sm">{negocio.proprietario_nome}</p>
                        <a
                          href={`mailto:${negocio.proprietario_email}`}
                          className="flex items-center gap-1.5 text-base sm:text-sm text-primary hover:underline mt-1 break-all"
                        >
                          <Mail className="h-4 w-4 sm:h-3.5 sm:w-3.5 shrink-0" />
                          {negocio.proprietario_email}
                        </a>
                        {negocio.proprietario_telefone && (
                          <a
                            href={`https://wa.me/55${negocio.proprietario_telefone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-base sm:text-sm text-green-600 hover:underline mt-1"
                          >
                            <Phone className="h-4 w-4 sm:h-3.5 sm:w-3.5 shrink-0" />
                            {negocio.proprietario_telefone}
                          </a>
                        )}
                      </div>
                      <div>
                        <p className="text-sm sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          Detalhes
                        </p>
                        <div className="space-y-1.5 text-base sm:text-sm">
                          {negocio.area_m2 && (
                            <p className="text-muted-foreground">
                              Área: <span className="text-foreground font-medium">{negocio.area_m2} m²</span>
                            </p>
                          )}
                          {negocio.preco && (
                            <p className="text-muted-foreground">
                              Preço pedido: <span className="text-foreground font-medium">{formatCurrency(negocio.preco)}</span>
                            </p>
                          )}
                          {negocio.faturamento_mensal && (
                            <p className="text-muted-foreground">
                              Faturamento: <span className="text-foreground font-medium">{formatCurrency(negocio.faturamento_mensal)}/mês</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    {negocio.descricao && (
                      <div className="mt-3">
                        <p className="text-sm sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                          Descrição
                        </p>
                        <p className="text-base sm:text-sm text-foreground leading-relaxed bg-card rounded-lg p-3 border border-border">
                          {negocio.descricao}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer: Actions — mobile-first, stacked no mobile / inline no desktop */}
                <div className="border-t border-border bg-muted/10 px-3 sm:px-4 py-3 space-y-2.5 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3">
                  {/* Toggle "Ver detalhes" — sempre visível, full width no mobile */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : negocio.id)}
                    className="flex w-full sm:w-auto items-center justify-center sm:justify-start gap-1.5 text-sm sm:text-xs text-muted-foreground hover:text-foreground active:text-foreground py-2 sm:py-0 transition-colors min-h-[36px] sm:min-h-0"
                  >
                    <Eye className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                    {isExpanded ? "Ocultar detalhes" : "Ver detalhes"}
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> : <ChevronDown className="h-3.5 w-3.5 sm:h-3 sm:w-3" />}
                  </button>

                  {isUpdating ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      {/* CTA PRIMÁRIO: Publicar nas redes — full-width no mobile, em destaque */}
                      <button
                        onClick={() => setPublishItem(negocio)}
                        className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-2.5 sm:py-1.5 text-sm sm:text-xs font-bold text-white hover:opacity-90 active:opacity-80 active:scale-[0.98] transition-all min-h-[44px] sm:min-h-0 shadow-sm sm:order-3"
                        title="Gerar arte e publicar nas redes sociais"
                      >
                        <Megaphone className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                        Publicar nas redes
                      </button>

                      {/* Ações secundárias — grid no mobile, inline no desktop */}
                      <div className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center sm:gap-2 sm:order-2">
                        <a
                          href={
                            (negocio as { tipo?: string }).tipo === "galeria"
                              ? `/galerias?id=${negocio.id}`
                              : `/anuncio/${negocio.id}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1 rounded-lg bg-primary/10 border border-primary/30 px-2 py-2 sm:px-3 sm:py-1.5 text-xs sm:text-xs font-semibold text-primary hover:bg-primary/15 active:bg-primary/20 active:scale-95 transition-all min-h-[40px] sm:min-h-0"
                          title="Abrir página pública"
                        >
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                          <span className="hidden xs:inline sm:inline">Ver página</span>
                          <span className="xs:hidden sm:hidden">Página</span>
                        </a>
                        <button
                          onClick={() => setShareItem(negocio)}
                          className="flex items-center justify-center gap-1 rounded-lg bg-violet-50 border border-violet-200 px-2 py-2 sm:px-3 sm:py-1.5 text-xs sm:text-xs font-semibold text-violet-700 hover:bg-violet-100 active:bg-violet-200 active:scale-95 transition-all min-h-[40px] sm:min-h-0"
                          title="Compartilhar link filtrado"
                        >
                          <Share2 className="h-3.5 w-3.5 shrink-0" />
                          Compartilhar
                        </button>
                        <button
                          onClick={() => {
                            if ((negocio as { tipo?: string }).tipo === "galeria") {
                              setEditingGaleriaId(negocio.id);
                            } else {
                              setEditingNegocio(negocio);
                            }
                          }}
                          className="flex items-center justify-center gap-1 rounded-lg bg-muted border border-border px-2 py-2 sm:px-3 sm:py-1.5 text-xs sm:text-xs font-semibold text-foreground hover:bg-muted/80 active:bg-muted/60 active:scale-95 transition-all min-h-[40px] sm:min-h-0"
                        >
                          <Pencil className="h-3.5 w-3.5 shrink-0" />
                          Editar
                        </button>

                        {/* Ações de status — só quando aplicáveis */}
                        {negocio.status !== "ativo" && (
                          <button
                            onClick={() => handleStatusChange(negocio.id, "ativo")}
                            className="flex items-center justify-center gap-1 rounded-lg bg-green-50 border border-green-200 px-2 py-2 sm:px-3 sm:py-1.5 text-xs sm:text-xs font-semibold text-green-700 hover:bg-green-100 active:bg-green-200 active:scale-95 transition-all min-h-[40px] sm:min-h-0"
                          >
                            <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                            Aprovar
                          </button>
                        )}
                        {negocio.status !== "rejeitado" && (
                          <button
                            onClick={() => handleStatusChange(negocio.id, "rejeitado")}
                            className="flex items-center justify-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2 py-2 sm:px-3 sm:py-1.5 text-xs sm:text-xs font-semibold text-red-700 hover:bg-red-100 active:bg-red-200 active:scale-95 transition-all min-h-[40px] sm:min-h-0"
                          >
                            <XCircle className="h-3.5 w-3.5 shrink-0" />
                            Rejeitar
                          </button>
                        )}
                        {negocio.status === "ativo" && (
                          <button
                            onClick={() => handleStatusChange(negocio.id, "vendido")}
                            className="flex items-center justify-center gap-1 rounded-lg bg-blue-50 border border-blue-200 px-2 py-2 sm:px-3 sm:py-1.5 text-xs sm:text-xs font-semibold text-blue-700 hover:bg-blue-100 active:bg-blue-200 active:scale-95 transition-all min-h-[40px] sm:min-h-0"
                          >
                            <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                            <span className="hidden xs:inline sm:inline">Marcar Vendido</span>
                            <span className="xs:hidden sm:hidden">Vendido</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(negocio)}
                          className="flex items-center justify-center gap-1 rounded-lg bg-destructive/10 border border-destructive/30 px-2 py-2 sm:px-3 sm:py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/15 active:bg-destructive/20 active:scale-95 transition-all min-h-[40px] sm:min-h-0"
                          title="Excluir permanentemente"
                        >
                          <Trash2 className="h-3.5 w-3.5 shrink-0" />
                          <span className="hidden xs:inline sm:inline">Excluir</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {publishItem && (
        <PublicarRedesModal
          negocio={publishItem}
          onClose={() => setPublishItem(null)}
        />
      )}

      {shareItem && (
        <CompartilharBuscaModal
          open={!!shareItem}
          onClose={() => setShareItem(null)}
          defaults={{
            categoria: shareItem.categoria,
            tipo: (shareItem as { tipo?: string }).tipo,
            bairro: shareItem.bairro || undefined,
            cidade: shareItem.cidade,
            preco: suggestPriceRange(shareItem.preco),
          }}
        />
      )}
    </AdminLayout>
  );
};

export default AdminNegocios;
