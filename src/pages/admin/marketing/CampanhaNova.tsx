import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Loader2, Users, RefreshCw } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import usePageTitle from "@/hooks/usePageTitle";
import { useEmailTemplates, useSaveCampaign, getAudienceCount } from "@/hooks/useEmailMarketing";
import { toast } from "sonner";
import type { EmailAudienceFilters } from "@/types/email.types";

const STATUS_OPTS = ["novo", "em-andamento", "convertido", "perdido"];
const ORIGEM_OPTS = ["contato-negocio", "contato-galeria", "anunciar", "newsletter", "exit-intent", "whatsapp"];

export default function CampanhaNova() {
  usePageTitle("Nova campanha | Admin");
  const navigate = useNavigate();
  const { data: templates = [] } = useEmailTemplates();
  const save = useSaveCampaign();

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [filters, setFilters] = useState<EmailAudienceFilters>({});
  const [statuses, setStatuses] = useState<string[]>([]);
  const [origens, setOrigens] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState("");
  const [audCount, setAudCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  const buildFilters = (): EmailAudienceFilters => ({
    ...filters,
    statuses: statuses.length ? statuses : undefined,
    origens: origens.length ? origens : undefined,
    tags_any: tagsInput.trim() ? tagsInput.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
  });

  const refreshCount = async () => {
    setLoadingCount(true);
    try {
      const n = await getAudienceCount(buildFilters());
      setAudCount(n);
    } catch (e: any) {
      toast.error(e.message || "Erro contando audiência");
    } finally {
      setLoadingCount(false);
    }
  };

  useEffect(() => {
    refreshCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statuses, origens, tagsInput]);

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const handleSave = async () => {
    if (!name.trim() || !subject.trim()) {
      toast.error("Nome e assunto obrigatórios");
      return;
    }
    try {
      const tpl = templates.find((t) => t.id === templateId);
      const created: any = await save.mutateAsync({
        name: name.trim(),
        subject: subject.trim(),
        preheader: preheader.trim() || null,
        template_id: templateId || null,
        html_content: tpl?.html_content || null,
        audience_filters: buildFilters(),
        source_type: "campaign",
        status: "draft",
      });
      toast.success("Campanha criada como rascunho");
      navigate(`/admin/marketing/campanhas/${created.id}`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar");
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-5 pb-10">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link to="/admin/marketing/campanhas" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="font-display text-xl font-bold">Nova campanha</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={save.isPending}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Criar como rascunho
          </button>
        </div>

        {/* Conteúdo */}
        <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h2 className="font-semibold text-sm">Conteúdo</h2>
          <FieldText label="Nome interno" value={name} onChange={setName} placeholder="Black Friday 2026" />
          <FieldText label="Assunto (visível pro destinatário)" value={subject} onChange={setSubject} placeholder="Oferta exclusiva, {{primeiro_nome}}" />
          <FieldText label="Preheader (opcional)" value={preheader} onChange={setPreheader} placeholder="Texto curto no inbox" />

          <div className="space-y-1">
            <label className="text-xs font-medium">Template</label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm"
            >
              <option value="">— sem template (definir HTML depois) —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Audiência */}
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="font-semibold text-sm flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Audiência</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-foreground">
                {loadingCount ? <Loader2 className="h-4 w-4 animate-spin inline" /> : <>{audCount ?? "—"} leads</>}
              </span>
              <button
                onClick={refreshCount}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingCount ? "animate-spin" : ""}`} /> Recalcular
              </button>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Exclui automaticamente: leads sem email, opt-out, descadastrados.
          </p>

          <FilterChips label="Status do lead" options={STATUS_OPTS} selected={statuses} onToggle={(v) => setStatuses(toggle(statuses, v))} />
          <FilterChips label="Origem do lead" options={ORIGEM_OPTS} selected={origens} onToggle={(v) => setOrigens(toggle(origens, v))} />

          <div className="space-y-1">
            <label className="text-xs font-medium">Tags (separadas por vírgula, vazio = todas)</label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="vip, newsletter"
              className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

function FieldText({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}

function FilterChips({ label, options, selected, onToggle }: { label: string; options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = selected.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => onToggle(o)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}
