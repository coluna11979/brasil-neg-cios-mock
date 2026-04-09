import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MessageCircle, Users, LogOut, UserCircle, Menu, X, Clock, Phone, Loader2, AlertTriangle, TrendingUp, BarChart3, Camera, Package } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { logout } from "@/stores/authStore";

const NAV = [
  { to: "/corretor/mensagens", label: "Mensagens", icon: MessageCircle },
  { to: "/corretor/leads", label: "Meus Leads", icon: Users },
  { to: "/corretor/pipeline", label: "Pipeline", icon: TrendingUp },
  { to: "/corretor/desempenho", label: "Desempenho", icon: BarChart3 },
  { to: "/corretor/materiais", label: "Materiais", icon: Package },
];

const CorretorLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [nomeCorretor, setNomeCorretor] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [ativo, setAtivo] = useState<boolean | null>(null);
  const [semTelefone, setSemTelefone] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado do formulário de telefone
  const [telefoneInput, setTelefoneInput] = useState("");
  const [savingTelefone, setSavingTelefone] = useState(false);
  const [telefoneError, setTelefoneError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { navigate("/corretor/login"); return; }

      const email = data.session.user.email || "";
      const meta = data.session.user.user_metadata;
      setNomeCorretor(meta?.nome || email.split("@")[0]);
      setProfileId(data.session.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("ativo, telefone, foto_url, nome, email, creci, bairro, regiao")
        .eq("id", data.session.user.id)
        .single();

      setAtivo(profile?.ativo ?? true);
      if (profile?.foto_url) setFotoUrl(profile.foto_url);
      if (profile?.nome) setNomeCorretor(profile.nome);

      // Bloqueia se não tiver telefone
      if (!profile?.telefone || profile.telefone.trim() === "") {
        setSemTelefone(true);
      }

      setLoadingProfile(false);
    });
  }, [navigate]);

  const handleLogout = async () => {
    await logout();
    navigate("/corretor/login");
  };

  const handleSalvarTelefone = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = telefoneInput.replace(/\D/g, "");
    if (digits.length < 10) {
      setTelefoneError("Digite um número válido com DDD (ex: 11 99999-9999)");
      return;
    }
    if (!profileId) return;
    setSavingTelefone(true);
    const { error } = await supabase
      .from("profiles")
      .update({ telefone: digits })
      .eq("id", profileId);
    if (error) {
      setTelefoneError("Erro ao salvar. Tente novamente.");
    } else {
      setSemTelefone(false);
    }
    setSavingTelefone(false);
  };

  const handleFotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profileId) return;
    setUploadingFoto(true);
    try {
      const path = `profiles/${profileId}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("lead-images")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("lead-images")
        .getPublicUrl(path);

      const publicUrl = urlData.publicUrl;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ foto_url: publicUrl })
        .eq("id", profileId);
      if (updateError) throw updateError;

      setFotoUrl(publicUrl + "?t=" + Date.now());
    } catch (err) {
      console.error("Erro ao fazer upload da foto:", err);
    } finally {
      setUploadingFoto(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const AvatarWidget = ({ size = "sm" }: { size?: "sm" | "md" }) => {
    const dim = size === "md" ? "h-10 w-10" : "h-8 w-8";
    const textSize = size === "md" ? "text-sm" : "text-xs";
    return (
      <div className={`relative ${dim} shrink-0 group cursor-pointer`} onClick={() => fileInputRef.current?.click()}>
        {uploadingFoto ? (
          <div className={`flex ${dim} items-center justify-center rounded-full bg-primary/10`}>
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        ) : fotoUrl ? (
          <img
            src={fotoUrl}
            alt={nomeCorretor}
            className={`${dim} rounded-full object-cover`}
          />
        ) : (
          <div className={`flex ${dim} items-center justify-center rounded-full bg-primary/10`}>
            <span className={`${textSize} font-semibold text-primary`}>{getInitials(nomeCorretor)}</span>
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className="h-3 w-3 text-white" />
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFotoSelect}
        />
      </div>
    );
  };

  if (loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Bloqueio: telefone obrigatório
  if (semTelefone) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-card text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 mb-5">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              WhatsApp obrigatório
            </h1>
            <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
              Para receber alertas de novos leads e usar o painel completo, precisamos do seu número de WhatsApp.
            </p>

            <form onSubmit={handleSalvarTelefone} className="mt-6 space-y-3 text-left">
              <label className="text-sm font-medium text-foreground">
                Número de WhatsApp (com DDD)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-600" />
                <input
                  type="tel"
                  placeholder="(11) 9 9999-9999"
                  value={telefoneInput}
                  onChange={(e) => { setTelefoneInput(e.target.value); setTelefoneError(""); }}
                  className="w-full rounded-xl border border-border bg-muted pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  autoFocus
                />
              </div>
              {telefoneError && (
                <p className="text-xs text-destructive">{telefoneError}</p>
              )}
              <button
                type="submit"
                disabled={savingTelefone || !telefoneInput.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {savingTelefone ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                Salvar e continuar
              </button>
            </form>

            <button
              onClick={handleLogout}
              className="mt-5 text-xs text-muted-foreground hover:text-foreground underline"
            >
              Sair da conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (ativo === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 mb-6">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Cadastro em Análise</h1>
          <p className="mt-3 text-muted-foreground">
            Seu cadastro como corretor está sendo analisado pela equipe NegócioJá.
            Em breve você receberá acesso completo ao painel.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Qualquer dúvida, entre em contato pelo WhatsApp.
          </p>
          <button
            onClick={handleLogout}
            className="mt-8 text-sm text-muted-foreground hover:text-foreground underline"
          >
            Sair da conta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-card">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <UserCircle className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Área do</p>
            <p className="font-display font-bold text-foreground text-sm truncate">Corretor</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3 mb-3">
            <AvatarWidget size="sm" />
            <p className="text-sm font-medium text-foreground truncate">{nomeCorretor}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-col flex-1 min-w-0">
        <header className="md:hidden flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <UserCircle className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-sm">Área do Corretor</span>
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>

        {mobileOpen && (
          <div className="md:hidden border-b border-border bg-card px-3 py-2 space-y-1">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  location.pathname.startsWith(to)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        )}

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default CorretorLayout;
