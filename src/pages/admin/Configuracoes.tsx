import { useEffect, useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import AdminLayout from "@/components/admin/AdminLayout";
import { getEmpresaConfig, saveEmpresaConfig, type EmpresaConfig } from "@/lib/empresaConfig";
import { Settings, Save, Loader2, Check, Building2, Phone, Mail, Globe, Instagram, Hash, MapPin } from "lucide-react";

const CalculadoraROI = () => {
  usePageTitle("Configurações | Admin");

  const [form, setForm] = useState<EmpresaConfig>({
    nome: "", telefone: "", whatsapp: "", email: "",
    site: "", instagram: "", cnpj: "", endereco: "",
  });
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  useEffect(() => {
    getEmpresaConfig().then((cfg) => { setForm(cfg); setLoading(false); });
  }, []);

  const set = (k: keyof EmpresaConfig, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const ok = await saveEmpresaConfig(form);
    setSaving(false);
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Settings className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Configurações</h1>
              <p className="text-sm text-muted-foreground">Dados da empresa exibidos em materiais e PDFs</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving  ? <Loader2 className="h-4 w-4 animate-spin" /> :
             saved   ? <Check   className="h-4 w-4" /> :
                       <Save    className="h-4 w-4" />}
            {saved ? "Salvo!" : "Salvar"}
          </button>
        </div>

        {/* Aviso */}
        <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <Building2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Esses dados aparecem no rodapé de <strong>todos os PDFs gerados</strong> (Calculadora ROI, Propostas, Materiais) e como contato em argumentos de IA — substituindo dados pessoais dos corretores.
          </p>
        </div>

        {/* Identidade */}
        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-muted/30">
            <h2 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" /> Identidade da Empresa
            </h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Nome da empresa</label>
              <input value={form.nome} onChange={(e) => set("nome", e.target.value)}
                placeholder="NegociaAky"
                className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">CNPJ</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="w-full rounded-xl border border-border bg-muted pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Endereço</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input value={form.endereco} onChange={(e) => set("endereco", e.target.value)}
                    placeholder="Rua, Cidade - UF"
                    className="w-full rounded-xl border border-border bg-muted pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contato */}
        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-muted/30">
            <h2 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <Phone className="h-4 w-4 text-green-600" /> Contato
            </h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Telefone / WhatsApp</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
                  <input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)}
                    placeholder="(11) 9 9999-9999"
                    className="w-full rounded-xl border border-border bg-muted pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <p className="text-xs text-muted-foreground">Número principal — aparece em todos os materiais</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input value={form.email} onChange={(e) => set("email", e.target.value)}
                    placeholder="contatonegociaaky@gmail.com"
                    type="email"
                    className="w-full rounded-xl border border-border bg-muted pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Site</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input value={form.site} onChange={(e) => set("site", e.target.value)}
                    placeholder="www.negociaaky.com.br"
                    className="w-full rounded-xl border border-border bg-muted pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Instagram</label>
                <div className="relative">
                  <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input value={form.instagram} onChange={(e) => set("instagram", e.target.value)}
                    placeholder="@negociaaky"
                    className="w-full rounded-xl border border-border bg-muted pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Preview */}
        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-muted/30">
            <h2 className="font-semibold text-sm text-foreground">Preview — Rodapé dos PDFs</h2>
          </div>
          <div className="p-5">
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px 20px", fontFamily: "system-ui, sans-serif" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>
                  Os valores são baseados nos dados informados. Valide com documentação real.
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1d4ed8" }}>{form.nome || "NegociaAky"}</div>
                  {form.whatsapp  && <div style={{ fontSize: 11, color: "#64748b" }}>📱 {form.whatsapp}</div>}
                  {form.email     && <div style={{ fontSize: 11, color: "#64748b" }}>✉️ {form.email}</div>}
                  {form.site      && <div style={{ fontSize: 11, color: "#64748b" }}>🌐 {form.site}</div>}
                  {form.instagram && <div style={{ fontSize: 11, color: "#64748b" }}>📸 {form.instagram}</div>}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Salvar bottom */}
        <div className="flex justify-end pb-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> :
             saved  ? <Check   className="h-4 w-4" /> :
                      <Save    className="h-4 w-4" />}
            {saved ? "Salvo com sucesso!" : "Salvar configurações"}
          </button>
        </div>

      </div>
    </AdminLayout>
  );
};

export default CalculadoraROI;
