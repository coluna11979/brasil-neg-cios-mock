import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import { UserCircle, LogIn, AlertCircle, Clock } from "lucide-react";
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
              NegócioJá — Acesso exclusivo para corretores
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-lg">
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

            <Button
              type="submit"
              className="w-full gap-2 font-semibold"
              size="lg"
              disabled={loading}
            >
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
        </div>
      </div>
    </div>
  );
};

export default CorretorLogin;
