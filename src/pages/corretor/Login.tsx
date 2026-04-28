import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import {
  UserCircle, LogIn, AlertCircle, Clock, Mail,
  CheckCircle2, KeyRound, Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import FaithQuote from "@/components/FaithQuote";

type Modo = "login" | "reset" | "nova-senha";

const CorretorLogin = () => {
  usePageTitle("Área do Corretor");
  const navigate = useNavigate();

  const [modo, setModo] = useState<Modo>("login");

  // ── Login ──────────────────────────────────────────────────────────────────
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [pendente, setPendente] = useState(false);

  // ── Esqueci senha ──────────────────────────────────────────────────────────
  const [resetEmail,   setResetEmail]   = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetEnviado, setResetEnviado] = useState(false);
  const [resetError,   setResetError]   = useState("");

  // ── Nova senha (recovery flow) ─────────────────────────────────────────────
  const [novaSenha,     setNovaSenha]     = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha,  setMostrarSenha]  = useState(false);
  const [salvando,      setSalvando]      = useState(false);
  const [erroSenha,     setErroSenha]     = useState("");
  const [senhaSalva,    setSenhaSalva]    = useState(false);

  // ── Detecta recovery session ao carregar a página ─────────────────────────
  // Múltiplas camadas de detecção (defensiva contra race conditions):
  //  A) token_hash na query string (PKCE flow) → verifyOtp
  //  B) flag sb_recovery em sessionStorage (setado por pre-boot.ts OU pelo
  //     listener global em src/lib/supabase.ts) → entra em modo nova-senha
  //  C) evento PASSWORD_RECOVERY disparado depois do mount → entra em modo
  //  D) polling curto (6s) como rede de segurança final
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const ativarNovaSenha = () => {
      if (cancelled) return;
      sessionStorage.removeItem("sb_recovery");
      setModo("nova-senha");
    };

    const detectarRecovery = async () => {
      // ── A) PKCE: ?token_hash=xxx&type=recovery ──────────────────────────────
      const params    = new URLSearchParams(window.location.search);
      const tokenHash = params.get("token_hash");
      const urlType   = params.get("type");

      if (tokenHash && urlType === "recovery") {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
        if (!cancelled) {
          if (!error) ativarNovaSenha();
          else setError("Link expirado. Use o botão abaixo para receber um novo.");
        }
        return;
      }

      // ── B) Flag já setado (pre-boot.ts ou listener global) ──────────────────
      if (sessionStorage.getItem("sb_recovery")) {
        ativarNovaSenha();
        return;
      }

      // ── C) Listener para eventos PASSWORD_RECOVERY que cheguem depois ───────
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY" && !cancelled) {
          ativarNovaSenha();
        }
      });
      unsubscribe = () => subscription.unsubscribe();

      // ── D) Polling curto — se o flag aparecer nos próximos 6s, ativamos.
      // Cobre o caso onde o evento PASSWORD_RECOVERY foi disparado antes de
      // registrarmos o listener acima (race condition no createClient).
      let ticks = 0;
      pollTimer = setInterval(() => {
        if (cancelled) return;
        if (sessionStorage.getItem("sb_recovery")) {
          if (pollTimer) clearInterval(pollTimer);
          ativarNovaSenha();
          return;
        }
        ticks += 1;
        if (ticks >= 12 && pollTimer) { // 12 * 500ms = 6s
          clearInterval(pollTimer);
          pollTimer = null;
        }
      }, 500);
    };

    detectarRecovery();
    return () => {
      cancelled = true;
      unsubscribe?.();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPendente(false);
    setLoading(true);
    try {
      const success = await login(email, password);
      if (success) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("ativo, role")
            .eq("id", user.id)
            .single();
          if (profile?.role === "corretor" && !profile?.ativo) {
            await supabase.auth.signOut();
            setPendente(true);
            return;
          }
        }
        navigate("/corretor");
      } else {
        setError("E-mail ou senha incorretos.");
      }
    } catch {
      setError("Erro ao conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: "https://www.negociaaky.com.br/corretor/login",
    });
    if (error) {
      setResetError("Erro ao enviar. Verifique o e-mail e tente novamente.");
    } else {
      setResetEnviado(true);
    }
    setResetLoading(false);
  };

  const handleNovaSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroSenha("");
    if (novaSenha.length < 6) {
      setErroSenha("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErroSenha("As senhas não coincidem. Tente novamente.");
      return;
    }
    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    if (error) {
      setErroSenha("Erro ao salvar. Solicite um novo link de acesso.");
    } else {
      setSenhaSalva(true);
      setTimeout(() => navigate("/corretor"), 2500);
    }
    setSalvando(false);
  };

  // ── Força da senha ─────────────────────────────────────────────────────────
  const forca = novaSenha.length === 0 ? 0
    : novaSenha.length < 6  ? 1
    : novaSenha.length < 9  ? 2
    : novaSenha.length < 12 ? 3 : 4;
  const forcaCor   = ["", "bg-red-400", "bg-amber-400", "bg-blue-400", "bg-green-500"][forca];
  const forcaLabel = ["", "Muito curta", "Fraca", "Boa", "Forte 💪"][forca];

  // ── Layout base ─────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-secondary px-4">
      <Link to="/" className="mb-8 text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Voltar para o site
      </Link>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
            {modo === "nova-senha"
              ? <KeyRound className="h-7 w-7 text-primary-foreground" />
              : <UserCircle className="h-7 w-7 text-primary-foreground" />
            }
          </div>
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold text-foreground">
              {modo === "nova-senha" ? "Criar Nova Senha" : "Área do Corretor"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              NegociaAky — Acesso exclusivo para corretores
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-lg">

          {/* ══ NOVA SENHA (recovery) ══════════════════════════════════════════ */}
          {modo === "nova-senha" && (
            <>
              {senhaSalva ? (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle2 className="h-7 w-7 text-green-600" />
                  </div>
                  <p className="font-semibold text-foreground">Senha criada com sucesso!</p>
                  <p className="text-sm text-muted-foreground">Entrando na sua área…</p>
                </div>
              ) : (
                <form onSubmit={handleNovaSenha} className="space-y-5">
                  <p className="text-sm text-muted-foreground text-center">
                    Escolha uma senha segura para acessar sua conta.
                  </p>

                  {erroSenha && (
                    <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {erroSenha}
                    </div>
                  )}

                  <div>
                    <Label htmlFor="nova-senha">Nova senha</Label>
                    <div className="relative mt-1.5">
                      <Input
                        id="nova-senha"
                        type={mostrarSenha ? "text" : "password"}
                        placeholder="Mínimo 6 caracteres"
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        required
                        autoFocus
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarSenha(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {novaSenha.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[1,2,3,4].map(n => (
                          <div key={n} className={`h-1.5 flex-1 rounded-full transition-all ${n <= forca ? forcaCor : "bg-muted"}`} />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">{forcaLabel}</p>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="confirmar-senha">Confirmar senha</Label>
                    <Input
                      id="confirmar-senha"
                      type={mostrarSenha ? "text" : "password"}
                      placeholder="Repita a senha"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      required
                      className="mt-1.5"
                    />
                  </div>

                  <Button type="submit" className="w-full gap-2 font-semibold" size="lg" disabled={salvando}>
                    <KeyRound className="h-4 w-4" />
                    {salvando ? "Salvando…" : "Salvar nova senha"}
                  </Button>
                </form>
              )}
            </>
          )}

          {/* ══ ESQUECI SENHA ═════════════════════════════════════════════════ */}
          {modo === "reset" && (
            <>
              {resetEnviado ? (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle2 className="h-7 w-7 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">E-mail enviado!</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Verifique sua caixa de entrada em <strong>{resetEmail}</strong> e clique no link para definir sua nova senha.
                    </p>
                  </div>
                  <button
                    onClick={() => { setModo("login"); setResetEnviado(false); setResetEmail(""); }}
                    className="mt-2 text-sm text-primary hover:underline font-medium"
                  >
                    ← Voltar para o login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleReset} className="space-y-5">
                  <div className="text-center mb-2">
                    <p className="font-semibold text-foreground">Recuperar acesso</p>
                    <p className="text-sm text-muted-foreground mt-1">Enviaremos um link para você definir uma nova senha.</p>
                  </div>
                  {resetError && (
                    <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {resetError}
                    </div>
                  )}
                  <div>
                    <Label htmlFor="reset-email">Seu e-mail</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="mt-1.5"
                      required
                      autoFocus
                    />
                  </div>
                  <Button type="submit" className="w-full gap-2 font-semibold" size="lg" disabled={resetLoading}>
                    <Mail className="h-4 w-4" />
                    {resetLoading ? "Enviando..." : "Enviar link de acesso"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setModo("login")}
                    className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Voltar para o login
                  </button>
                </form>
              )}
            </>
          )}

          {/* ══ LOGIN ═════════════════════════════════════════════════════════ */}
          {modo === "login" && (
            <>
              <form onSubmit={handleSubmit} className="space-y-5">
                {pendente && (
                  <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                    <Clock className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                    <div>
                      <p className="font-semibold">Cadastro em análise</p>
                      <p className="mt-0.5 text-amber-700">Sua conta ainda não foi aprovada. Em até 24h você receberá um aviso pelo WhatsApp.</p>
                    </div>
                  </div>
                )}
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1.5"
                    required
                  />
                </div>
                <Button type="submit" className="w-full gap-2 font-semibold" size="lg" disabled={loading}>
                  <LogIn className="h-4 w-4" />
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>

              {/* Divisor */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground">ou</span>
                </div>
              </div>

              {/* Botão Esqueci minha senha — destaque */}
              <button
                type="button"
                onClick={() => { setModo("reset"); setResetEmail(email); }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/10 hover:border-primary/50 transition-all"
              >
                <Mail className="h-4 w-4" />
                Esqueci minha senha / Primeiro acesso
              </button>

              <p className="mt-4 text-center text-xs text-muted-foreground">
                Não tem acesso?{" "}
                <Link to="/seja-corretor" className="text-primary hover:underline font-medium">
                  Quero ser corretor
                </Link>
              </p>
            </>
          )}

        </div>

        {/* Frase do ecossistema */}
        <div className="mt-8">
          <FaithQuote variant="muted" />
        </div>
      </div>
    </div>
  );
};

export default CorretorLogin;
