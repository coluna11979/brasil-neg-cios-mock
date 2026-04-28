import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import FaithQuote from "@/components/FaithQuote";

const CorretorNovaSenha = () => {
  usePageTitle("Criar Nova Senha | NegociaAky");
  const navigate = useNavigate();

  const [sessionPronta, setSessionPronta] = useState(false);
  const [verificando, setVerificando]     = useState(true);

  const [senha,       setSenha]       = useState("");
  const [confirmar,   setConfirmar]   = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [salvando,    setSalvando]    = useState(false);
  const [erro,        setErro]        = useState("");
  const [sucesso,     setSucesso]     = useState(false);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // ── 1. PKCE flow: token_hash como query param ──────────────────────────
      const searchParams = new URLSearchParams(window.location.search);
      const tokenHash = searchParams.get("token_hash");
      const urlType   = searchParams.get("type");

      if (tokenHash && urlType === "recovery") {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
        if (!cancelled) {
          setSessionPronta(!error);
          setVerificando(false);
        }
        return;
      }

      // ── 2. Implicit flow: Supabase já processou o hash e criou a sessão ────
      //    O evento PASSWORD_RECOVERY dispara na init do cliente (antes do
      //    useEffect rodar), então conferimos a sessão ativa diretamente.
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        if (!cancelled) {
          setSessionPronta(true);
          setVerificando(false);
        }
        return;
      }

      // ── 3. Fallback: escuta o evento caso o timing seja favorável ──────────
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
          if (!cancelled) {
            setSessionPronta(true);
            setVerificando(false);
          }
        }
      });

      // Timeout: se em 4s nada aconteceu, link é inválido
      const timer = setTimeout(() => {
        if (!cancelled) setVerificando(false);
        subscription.unsubscribe();
      }, 4000);

      return () => {
        subscription.unsubscribe();
        clearTimeout(timer);
      };
    };

    init();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");

    if (senha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmar) {
      setErro("As senhas não coincidem. Verifique e tente novamente.");
      return;
    }

    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      setErro("Não foi possível salvar. Solicite um novo link de acesso.");
    } else {
      setSucesso(true);
      setTimeout(() => navigate("/corretor"), 2500);
    }
    setSalvando(false);
  };

  // ── Carregando ────────────────────────────────────────────────────────────
  if (verificando) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-secondary gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Verificando link de acesso…</p>
      </div>
    );
  }

  // ── Link inválido ─────────────────────────────────────────────────────────
  if (!sessionPronta) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-secondary px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg text-center space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 mx-auto">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <p className="font-semibold text-foreground text-lg">Link inválido ou expirado</p>
          <p className="text-sm text-muted-foreground">
            Este link já foi usado ou expirou. Solicite um novo no login.
          </p>
          <Link
            to="/corretor/login"
            className="inline-block w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Ir para o login
          </Link>
        </div>
      </div>
    );
  }

  // ── Sucesso ───────────────────────────────────────────────────────────────
  if (sucesso) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-secondary px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg text-center space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 mx-auto">
            <CheckCircle2 className="h-7 w-7 text-green-600" />
          </div>
          <p className="font-semibold text-foreground text-lg">Senha criada com sucesso!</p>
          <p className="text-sm text-muted-foreground">Entrando na sua área…</p>
          <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
        </div>
      </div>
    );
  }

  // ── Formulário ────────────────────────────────────────────────────────────
  const forca = senha.length === 0 ? 0
    : senha.length < 6  ? 1
    : senha.length < 9  ? 2
    : senha.length < 12 ? 3
    : 4;

  const forcaLabel = ["", "Muito curta", "Fraca", "Boa", "Forte 💪"][forca];
  const forcaColor = ["", "bg-red-400", "bg-amber-400", "bg-blue-400", "bg-green-500"][forca];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-secondary px-4">
      <Link to="/" className="mb-8 text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Voltar para o site
      </Link>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <KeyRound className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold text-foreground">Criar Nova Senha</h1>
            <p className="mt-1 text-sm text-muted-foreground">NegociaAky — Área do Corretor</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-sm text-muted-foreground text-center">
              Escolha uma senha segura para acessar sua conta.
            </p>

            {erro && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {erro}
              </div>
            )}

            <div>
              <Label htmlFor="senha">Nova senha</Label>
              <div className="relative mt-1.5">
                <Input
                  id="senha"
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
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

            {/* Barra de força */}
            {senha.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map(n => (
                    <div
                      key={n}
                      className={`h-1.5 flex-1 rounded-full transition-all ${n <= forca ? forcaColor : "bg-muted"}`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{forcaLabel}</p>
              </div>
            )}

            <div>
              <Label htmlFor="confirmar">Confirmar senha</Label>
              <Input
                id="confirmar"
                type={mostrarSenha ? "text" : "password"}
                placeholder="Repita a senha"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                required
                className="mt-1.5"
              />
            </div>

            <Button type="submit" className="w-full gap-2 font-semibold" size="lg" disabled={salvando}>
              <KeyRound className="h-4 w-4" />
              {salvando ? "Salvando…" : "Salvar nova senha"}
            </Button>
          </form>
        </div>

        {/* Frase do ecossistema */}
        <div className="mt-8">
          <FaithQuote variant="muted" />
        </div>
      </div>
    </div>
  );
};

export default CorretorNovaSenha;
