import { useEffect, useRef, useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import CorretorLayout from "@/components/corretor/CorretorLayout";
import { supabase } from "@/lib/supabase";
import { Camera, Check, Loader2, Lock, Save, UserCog } from "lucide-react";

interface ProfileForm {
  nome: string;
  telefone: string;
  creci: string;
  bairro: string;
  regiao: string;
  sobre: string;
}

const CorretorPerfil = () => {
  usePageTitle("Meu Perfil | Área do Corretor");

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [form, setForm] = useState<ProfileForm>({ nome: "", telefone: "", creci: "", bairro: "", regiao: "", sobre: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password change
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdOk, setPwdOk] = useState(false);
  const [pwdError, setPwdError] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserId(session.user.id);
      setEmail(session.user.email || "");

      const { data } = await supabase
        .from("profiles")
        .select("nome, telefone, creci, bairro, regiao, sobre, foto_url")
        .eq("id", session.user.id)
        .single();

      if (data) {
        setForm({
          nome: data.nome || "",
          telefone: formatPhoneDisplay(data.telefone || ""),
          creci: data.creci || "",
          bairro: data.bairro || "",
          regiao: data.regiao || "",
          sobre: data.sobre || "",
        });
        setFotoUrl(data.foto_url || "");
      }
      setLoading(false);
    };
    load();
  }, []);

  const formatPhoneDisplay = (val: string) => {
    const d = val.replace(/\D/g, "");
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return val;
  };

  const getInitials = (name: string) =>
    name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    const telefoneDigits = form.telefone.replace(/\D/g, "");
    const { error } = await supabase
      .from("profiles")
      .update({
        nome: form.nome,
        telefone: telefoneDigits,
        creci: form.creci,
        bairro: form.bairro,
        regiao: form.regiao,
        sobre: form.sobre,
      })
      .eq("id", userId);
    setSaving(false);
    if (!error) {
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 3000);
    }
  };

  const handleFotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploadingFoto(true);
    try {
      const path = `profiles/${userId}.jpg`;
      await supabase.storage.from("lead-images").upload(path, file, { upsert: true, contentType: file.type });
      const { data: urlData } = supabase.storage.from("lead-images").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      await supabase.from("profiles").update({ foto_url: publicUrl }).eq("id", userId);
      setFotoUrl(publicUrl + "?t=" + Date.now());
    } catch (err) {
      console.error("Erro ao fazer upload:", err);
    } finally {
      setUploadingFoto(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    if (novaSenha.length < 6) { setPwdError("A senha precisa ter pelo menos 6 caracteres."); return; }
    if (novaSenha !== confirmarSenha) { setPwdError("As senhas não conferem."); return; }
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setSavingPwd(false);
    if (error) {
      setPwdError(error.message);
    } else {
      setPwdOk(true);
      setNovaSenha("");
      setConfirmarSenha("");
      setTimeout(() => setPwdOk(false), 4000);
    }
  };

  if (loading) {
    return (
      <CorretorLayout>
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      </CorretorLayout>
    );
  }

  return (
    <CorretorLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <UserCog className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Meu Perfil</h1>
            <p className="text-sm text-muted-foreground">Edite seus dados e foto de perfil</p>
          </div>
        </div>

        {/* Foto de Perfil */}
        <div className="rounded-2xl border border-border bg-card p-6 flex items-center gap-6">
          <div className="relative group cursor-pointer shrink-0" onClick={() => fileInputRef.current?.click()}>
            {uploadingFoto ? (
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : fotoUrl ? (
              <img src={fotoUrl} alt="Foto" className="h-24 w-24 rounded-full object-cover ring-4 ring-primary/20" />
            ) : (
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center ring-4 ring-primary/20">
                <span className="text-2xl font-bold text-primary">{getInitials(form.nome)}</span>
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-6 w-6 text-white" />
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFotoSelect} />
          </div>
          <div>
            <p className="font-semibold text-foreground text-lg">{form.nome || "—"}</p>
            <p className="text-sm text-muted-foreground">{email}</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 text-xs text-primary font-medium hover:underline"
            >
              Clique na foto para alterar
            </button>
          </div>
        </div>

        {/* Formulário de dados */}
        <form onSubmit={handleSave} className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <h2 className="font-semibold text-foreground text-base">Dados Pessoais</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nome */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nome completo</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Seu nome completo"
                required
              />
            </div>

            {/* Telefone */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">WhatsApp / Telefone</label>
              <input
                type="tel"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="(11) 9 9999-9999"
              />
            </div>

            {/* CRECI */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">CRECI</label>
              <input
                type="text"
                value={form.creci}
                onChange={(e) => setForm({ ...form, creci: e.target.value })}
                className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Número do CRECI"
              />
            </div>

            {/* Bairro */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Bairro de atuação</label>
              <input
                type="text"
                value={form.bairro}
                onChange={(e) => setForm({ ...form, bairro: e.target.value })}
                className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Ex: Moema, Itaim..."
              />
            </div>

            {/* Região */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Região</label>
              <input
                type="text"
                value={form.regiao}
                onChange={(e) => setForm({ ...form, regiao: e.target.value })}
                className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Ex: Zona Sul, Grande SP..."
              />
            </div>

            {/* Sobre */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-sm font-medium text-foreground">Sobre você</label>
              <textarea
                value={form.sobre}
                onChange={(e) => setForm({ ...form, sobre: e.target.value })}
                rows={3}
                className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                placeholder="Breve descrição da sua experiência e área de atuação..."
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar alterações
            </button>
            {savedOk && (
              <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                <Check className="h-4 w-4" /> Dados salvos!
              </span>
            )}
          </div>
        </form>

        {/* Alterar Senha */}
        <form onSubmit={handleChangePassword} className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground text-base">Alterar Senha</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nova senha</label>
              <input
                type="password"
                value={novaSenha}
                onChange={(e) => { setNovaSenha(e.target.value); setPwdError(""); }}
                className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Confirmar nova senha</label>
              <input
                type="password"
                value={confirmarSenha}
                onChange={(e) => { setConfirmarSenha(e.target.value); setPwdError(""); }}
                className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Repita a nova senha"
                autoComplete="new-password"
              />
            </div>
          </div>

          {pwdError && <p className="text-xs text-destructive">{pwdError}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={savingPwd || !novaSenha || !confirmarSenha}
              className="flex items-center gap-2 rounded-xl bg-muted border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/70 transition-colors disabled:opacity-50"
            >
              {savingPwd ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Alterar senha
            </button>
            {pwdOk && (
              <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                <Check className="h-4 w-4" /> Senha alterada com sucesso!
              </span>
            )}
          </div>
        </form>
      </div>
    </CorretorLayout>
  );
};

export default CorretorPerfil;
