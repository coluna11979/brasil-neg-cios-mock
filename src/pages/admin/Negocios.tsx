import { useEffect, useState } from "react";
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
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
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
  descricao: "",
  proprietario_nome: "",
  proprietario_telefone: "",
  proprietario_email: "",
  status: "ativo" as Negocio["status"],
};

interface NovoNegocioModalProps {
  onClose: () => void;
  onSaved: (negocio: Negocio) => void;
}

const NovoNegocioModal = ({ onClose, onSaved }: NovoNegocioModalProps) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

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
    if (!form.categoria) e.categoria = "Selecione uma categoria";
    if (!form.cidade.trim()) e.cidade = "Cidade é obrigatória";
    if (!form.estado) e.estado = "Selecione o estado";
    if (!form.proprietario_nome.trim()) e.proprietario_nome = "Nome é obrigatório";
    if (!form.proprietario_email.trim()) {
      e.proprietario_email = "E-mail é obrigatório";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.proprietario_email)) {
      e.proprietario_email = "E-mail inválido";
    }
    if (!form.descricao.trim()) e.descricao = "Descrição é obrigatória";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);

    const { data, error } = await supabase
      .from("negocios")
      .insert({
        titulo: form.titulo,
        categoria: form.categoria,
        cidade: form.cidade,
        estado: form.estado,
        bairro: form.bairro || null,
        preco: form.preco ? Number(form.preco) : null,
        faturamento_mensal: form.faturamento_mensal ? Number(form.faturamento_mensal) : null,
        area_m2: form.area_m2 ? Number(form.area_m2) : null,
        descricao: form.descricao,
        proprietario_nome: form.proprietario_nome,
        proprietario_telefone: form.proprietario_telefone || null,
        proprietario_email: form.proprietario_email,
        status: form.status,
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      setErrors({ submit: "Erro ao salvar. Tente novamente." });
      return;
    }
    onSaved(data as Negocio);
  };

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-6 px-4"
      onClick={handleBackdrop}
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">Novo Negócio</h2>
              <p className="text-xs text-muted-foreground">Cadastro direto pelo admin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errors.submit && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errors.submit}
            </div>
          )}

          {/* Status (admin pode definir direto) */}
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

              <div>
                <Label htmlFor="m-area">Área (m²)</Label>
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

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" className="gap-2" disabled={saving}>
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</>
              ) : (
                <><Save className="h-4 w-4" />Salvar Negócio</>
              )}
            </Button>
          </div>
        </form>
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

const EditNegocioModal = ({ negocio, onClose, onSaved }: EditNegocioModalProps) => {
  const [form, setForm] = useState({
    titulo: negocio.titulo,
    categoria: negocio.categoria,
    cidade: negocio.cidade,
    estado: negocio.estado,
    preco: negocio.preco?.toString() ?? "",
    faturamento_mensal: negocio.faturamento_mensal?.toString() ?? "",
    area_m2: negocio.area_m2?.toString() ?? "",
    descricao: negocio.descricao ?? "",
    proprietario_nome: negocio.proprietario_nome,
    proprietario_telefone: negocio.proprietario_telefone ?? "",
    proprietario_email: negocio.proprietario_email,
    status: negocio.status,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.titulo.trim()) e.titulo = "Título é obrigatório";
    if (!form.categoria) e.categoria = "Selecione uma categoria";
    if (!form.cidade.trim()) e.cidade = "Cidade é obrigatória";
    if (!form.estado) e.estado = "Selecione o estado";
    if (!form.proprietario_nome.trim()) e.proprietario_nome = "Nome é obrigatório";
    if (!form.proprietario_email.trim()) e.proprietario_email = "E-mail é obrigatório";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);

    const fields = {
      titulo: form.titulo,
      categoria: form.categoria,
      cidade: form.cidade,
      estado: form.estado,
      preco: form.preco ? Number(form.preco) : undefined,
      faturamento_mensal: form.faturamento_mensal ? Number(form.faturamento_mensal) : undefined,
      area_m2: form.area_m2 ? Number(form.area_m2) : undefined,
      descricao: form.descricao,
      proprietario_nome: form.proprietario_nome,
      proprietario_telefone: form.proprietario_telefone || undefined,
      proprietario_email: form.proprietario_email,
      status: form.status,
    };

    const ok = await updateNegocio(negocio.id, fields);
    setSaving(false);

    if (!ok) {
      setErrors({ submit: "Erro ao salvar. Tente novamente." });
      return;
    }
    onSaved({ ...negocio, ...fields });
  };

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-6 px-4"
      onClick={handleBackdrop}
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl">
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
                <Label htmlFor="e-area">Área (m²)</Label>
                <div className="relative mt-1.5">
                  <Ruler className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="e-area" name="area_m2" type="number" value={form.area_m2} onChange={handleChange} placeholder="150" className="pl-10" />
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

  useEffect(() => {
    getAllNegocios().then((data) => {
      setNegocios(data);
      setLoading(false);
    });
  }, []);

  const handleStatusChange = async (id: string, newStatus: Negocio["status"]) => {
    setUpdating(id);
    const ok = await updateNegocioStatus(id, newStatus);
    if (ok) {
      setNegocios((prev) => prev.map((n) => (n.id === id ? { ...n, status: newStatus } : n)));
    }
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

      {/* Edit Modal */}
      {editingNegocio && (
        <EditNegocioModal
          negocio={editingNegocio}
          onClose={() => setEditingNegocio(null)}
          onSaved={handleEdited}
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
                        <h3 className="font-display font-bold text-foreground leading-tight">
                          {negocio.titulo}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                          <span className="text-sm text-muted-foreground">{negocio.categoria}</span>
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            {negocio.cidade}, {negocio.estado}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {timeAgo(negocio.criado_em)}
                          </span>
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusCfg.bg} ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2">
                      {negocio.preco && (
                        <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                          <DollarSign className="h-3.5 w-3.5 text-primary" />
                          {formatCurrency(negocio.preco)}
                        </span>
                      )}
                      {negocio.faturamento_mensal && (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <TrendingUp className="h-3.5 w-3.5 text-green-600" />
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
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          Proprietário
                        </p>
                        <p className="font-medium text-foreground text-sm">{negocio.proprietario_nome}</p>
                        <a
                          href={`mailto:${negocio.proprietario_email}`}
                          className="flex items-center gap-1.5 text-sm text-primary hover:underline mt-1"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          {negocio.proprietario_email}
                        </a>
                        {negocio.proprietario_telefone && (
                          <a
                            href={`https://wa.me/55${negocio.proprietario_telefone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm text-green-600 hover:underline mt-1"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {negocio.proprietario_telefone}
                          </a>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          Detalhes
                        </p>
                        <div className="space-y-1 text-sm">
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
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Descrição
                        </p>
                        <p className="text-sm text-foreground leading-relaxed bg-card rounded-lg p-3 border border-border">
                          {negocio.descricao}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer: Actions */}
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-muted/10">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : negocio.id)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {isExpanded ? "Ocultar detalhes" : "Ver detalhes"}
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>

                  <div className="flex items-center gap-2">
                    {isUpdating ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <button
                          onClick={() => setEditingNegocio(negocio)}
                          className="flex items-center gap-1.5 rounded-lg bg-muted border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/80 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </button>
                        {negocio.status !== "ativo" && (
                          <button
                            onClick={() => handleStatusChange(negocio.id, "ativo")}
                            className="flex items-center gap-1.5 rounded-lg bg-green-50 border border-green-200 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 transition-colors"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Aprovar
                          </button>
                        )}
                        {negocio.status !== "rejeitado" && (
                          <button
                            onClick={() => handleStatusChange(negocio.id, "rejeitado")}
                            className="flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Rejeitar
                          </button>
                        )}
                        {negocio.status === "ativo" && (
                          <button
                            onClick={() => handleStatusChange(negocio.id, "vendido")}
                            className="flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Marcar Vendido
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminNegocios;
