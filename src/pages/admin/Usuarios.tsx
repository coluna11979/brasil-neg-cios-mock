import { useEffect, useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import {
  Users, Phone, Mail, ShieldCheck, UserCheck, Search,
  ToggleLeft, ToggleRight, Loader2, Crown, RefreshCw, ShieldAlert,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/lib/supabase";

interface Profile {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  role: "admin" | "corretor";
  creci?: string;
  regiao?: string;
  ativo: boolean;
  criado_em: string;
}

const ROLE_STYLE = {
  admin: "bg-purple-100 text-purple-700 border-purple-200",
  corretor: "bg-blue-100 text-blue-700 border-blue-200",
};

const ROLE_LABEL = {
  admin: "Admin",
  corretor: "Corretor",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `${days} dias atrás`;
  const months = Math.floor(days / 30);
  return `${months} ${months === 1 ? "mês" : "meses"} atrás`;
}

const AdminUsuarios = () => {
  usePageTitle("Usuários");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("criado_em", { ascending: false });
    if (!error && data) setProfiles(data as Profile[]);
    setLoading(false);
  };

  useEffect(() => { fetchProfiles(); }, []);

  /**
   * Apenas REBAIXA admin → corretor. Promover corretor → admin é proibido
   * por design (regra de negócio + trigger no banco). Para criar um novo
   * admin, é preciso fazer via SQL direto no Supabase Dashboard.
   */
  const rebaixarAdmin = async (profile: Profile) => {
    if (profile.role !== "admin") return;
    if (!confirm(`Rebaixar ${profile.nome} de Admin para Corretor?`)) return;
    setUpdating(profile.id);
    const { error } = await supabase
      .from("profiles")
      .update({ role: "corretor" })
      .eq("id", profile.id);
    if (!error) {
      setProfiles((prev) =>
        prev.map((p) => p.id === profile.id ? { ...p, role: "corretor" } : p)
      );
    }
    setUpdating(null);
  };

  const toggleAtivo = async (profile: Profile) => {
    setUpdating(profile.id);
    const { error } = await supabase
      .from("profiles")
      .update({ ativo: !profile.ativo })
      .eq("id", profile.id);
    if (!error) {
      setProfiles((prev) =>
        prev.map((p) => p.id === profile.id ? { ...p, ativo: !p.ativo } : p)
      );
    }
    setUpdating(null);
  };

  const filtrados = profiles.filter((p) => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return (
      p.nome.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.telefone?.includes(q) ||
      p.role.includes(q)
    );
  });

  const admins = filtrados.filter((p) => p.role === "admin").length;
  const corretores = filtrados.filter((p) => p.role === "corretor").length;
  const ativos = filtrados.filter((p) => p.ativo).length;

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {admins} admin{admins !== 1 ? "s" : ""} · {corretores} corretor{corretores !== 1 ? "es" : ""} · {ativos} ativo{ativos !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="rounded-lg border border-border bg-card pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-56"
            />
          </div>
          <button
            onClick={fetchProfiles}
            className="flex items-center justify-center h-9 w-9 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted transition-colors"
            title="Recarregar"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Aviso de segurança sobre roles */}
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
        <div>
          <p className="font-semibold">Política de privilégios</p>
          <p className="mt-0.5 text-amber-700">
            Corretores <strong>não podem</strong> ser promovidos a admin pela interface — esta regra é
            reforçada por trigger no banco. Para criar um novo administrador, edite diretamente
            via SQL no Supabase Dashboard.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Users className="h-12 w-12 mb-3 opacity-20" />
          <p className="font-medium">Nenhum usuário encontrado</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border border-border overflow-hidden bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Usuário</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Contato</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">CRECI / Região</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Tipo</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Cadastro</th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtrados.map((profile) => (
                  <tr key={profile.id} className={`transition-colors hover:bg-muted/30 ${!profile.ativo ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
                          {profile.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{profile.nome}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[160px]">{profile.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {profile.telefone ? (
                          <span className="flex items-center gap-1.5 text-xs text-foreground">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            {profile.telefone}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Sem telefone</span>
                        )}
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          {profile.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {profile.creci ? (
                          <p className="text-xs text-foreground font-medium">{profile.creci}</p>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Sem CRECI</span>
                        )}
                        {profile.regiao && (
                          <p className="text-xs text-muted-foreground">{profile.regiao}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${ROLE_STYLE[profile.role]}`}>
                        {profile.role === "admin" ? <Crown className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                        {ROLE_LABEL[profile.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${profile.ativo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {profile.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {timeAgo(profile.criado_em)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {updating === profile.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <>
                            {/* Apenas REBAIXAR admin → corretor é permitido pela UI.
                                Promover corretor → admin é proibido (regra de negócio). */}
                            {profile.role === "admin" ? (
                              <button
                                onClick={() => rebaixarAdmin(profile)}
                                title="Rebaixar para Corretor"
                                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium border border-border bg-card hover:bg-muted transition-colors"
                              >
                                <UserCheck className="h-3.5 w-3.5" /> → Corretor
                              </button>
                            ) : null}
                            <button
                              onClick={() => toggleAtivo(profile)}
                              title={profile.ativo ? "Desativar" : "Ativar"}
                              className="flex items-center justify-center h-8 w-8 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-muted-foreground"
                            >
                              {profile.ativo ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4 text-red-500" />}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtrados.map((profile) => (
              <div key={profile.id} className={`rounded-xl border border-border bg-card p-4 shadow-sm ${!profile.ativo ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
                      {profile.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{profile.nome}</p>
                      <p className="text-xs text-muted-foreground">{profile.email}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${ROLE_STYLE[profile.role]}`}>
                    {profile.role === "admin" ? <Crown className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                    {ROLE_LABEL[profile.role]}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {profile.telefone && (
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{profile.telefone}</span>
                  )}
                  {profile.creci && (
                    <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" />{profile.creci}</span>
                  )}
                  {profile.regiao && <span>{profile.regiao}</span>}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${profile.ativo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {profile.ativo ? "Ativo" : "Inativo"}
                  </span>
                  {updating === profile.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <div className="flex gap-2">
                      {profile.role === "admin" && (
                        <button onClick={() => rebaixarAdmin(profile)} className="rounded-lg border border-border bg-card px-2 py-1 text-xs hover:bg-muted transition-colors">
                          → Corretor
                        </button>
                      )}
                      <button onClick={() => toggleAtivo(profile)} className="rounded-lg border border-border bg-card px-2 py-1 text-xs hover:bg-muted transition-colors">
                        {profile.ativo ? "Desativar" : "Ativar"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminUsuarios;
