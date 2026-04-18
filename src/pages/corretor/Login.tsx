import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import { UserCircle, LogIn, AlertCircle, Clock, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";

const CorretorLogin = () => {
  usePageTitle("Área do Corretor");
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendente, setPendente] = useState(false);

  // Esqueci senha
  const [modo, setModo] = useState<"login" | "reset">("login");
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetEnviado, setResetEnviado] = useState(false);
  const [resetError, setResetError] = useState("");

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: "https://negociaaky.com.br/corretor/login",
    });
    if (error) {
      setResetError("Erro ao enviar. Verifique o e-mail e tente novamente.");
    } else {
      setResetEnviado(true);
    }
    setResetLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPendente(false);
    setLoading(true);
    try {
      const success = await login(email, password);
      if (success) {
        // Verifica se o corretor está aprovado
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("ativo, role")
            .eq("id", user.id)
            .single();

          if (profile?.role === "corretor" && !profile?.ativo) {
            // Faz logout e bloqueia o acesso
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-secondary px-4">
      {/* Back to site */}
      <Link
        to="/"
        className="mb-8 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Voltar para o site
      </Link>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <UserCircle className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold text-foreground">
              Área do Corretor
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              NegociaAky — Acesso exclusivo para corretores
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-lg">

          {/* ── MODO RESET ── */}
          {modo === "reset" ? (
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
          ) : (
          /* ── MODO LOGIN ── */
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <button
                    type="button"
                    onClick={() => { setModo("reset"); setResetEmail(email); }}
                    className="text-xs text-primary hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>
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
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Não tem acesso?{" "}
              <Link to="/seja-corretor" className="text-primary hover:underline font-medium">
                Quero ser corretor
              </Link>
            </p>
          </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CorretorLogin;
