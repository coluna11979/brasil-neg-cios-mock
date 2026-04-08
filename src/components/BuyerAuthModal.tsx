import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useBuyer } from "@/contexts/BuyerContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Heart } from "lucide-react";

type Tab = "entrar" | "cadastrar";

const BuyerAuthModal = () => {
  const { showAuthModal, closeAuthModal } = useBuyer();
  const [tab, setTab] = useState<Tab>("entrar");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({ nome: "", email: "", senha: "" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleEntrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.senha });
    setLoading(false);
    if (error) { setError("E-mail ou senha incorretos."); return; }
    closeAuthModal();
  };

  const handleCadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.senha,
      options: { data: { nome: form.nome } },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSuccess("Conta criada! Verifique seu e-mail para confirmar.");
  };

  const switchTab = (t: Tab) => { setTab(t); setError(""); setSuccess(""); };

  return (
    <Dialog open={showAuthModal} onOpenChange={(open) => !open && closeAuthModal()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Heart className="h-6 w-6 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center font-display text-xl">
            {tab === "entrar" ? "Entre para salvar favoritos" : "Crie sua conta grátis"}
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex rounded-lg border border-border overflow-hidden mb-4">
          {(["entrar", "cadastrar"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => switchTab(t)}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {t === "entrar" ? "Entrar" : "Criar conta"}
            </button>
          ))}
        </div>

        {success ? (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 text-center">
            {success}
          </div>
        ) : (
          <form onSubmit={tab === "entrar" ? handleEntrar : handleCadastrar} className="space-y-4">
            {tab === "cadastrar" && (
              <div>
                <Label htmlFor="nome">Nome completo</Label>
                <Input id="nome" className="mt-1.5" placeholder="Seu nome" value={form.nome} onChange={set("nome")} required />
              </div>
            )}
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" className="mt-1.5" placeholder="seu@email.com" value={form.email} onChange={set("email")} required />
            </div>
            <div>
              <Label htmlFor="senha">Senha</Label>
              <Input id="senha" type="password" className="mt-1.5" placeholder="••••••••" value={form.senha} onChange={set("senha")} required minLength={6} />
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button type="submit" className="w-full font-semibold" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tab === "entrar" ? "Entrar" : "Criar conta"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              {tab === "entrar" ? (
                <>Não tem conta?{" "}
                  <button type="button" onClick={() => switchTab("cadastrar")} className="text-primary font-medium hover:underline">
                    Cadastre-se grátis
                  </button>
                </>
              ) : (
                <>Já tem conta?{" "}
                  <button type="button" onClick={() => switchTab("entrar")} className="text-primary font-medium hover:underline">
                    Entrar
                  </button>
                </>
              )}
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BuyerAuthModal;
