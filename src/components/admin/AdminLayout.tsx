import { type ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  LogOut,
  ChevronRight,
  Kanban,
  MessageSquare,
  Store,
  UserCheck,
  UserCog,
  Package,
  Settings,
  Plug,
  UserCheck as UserCheckIcon,
  Instagram,
  Sparkles,
  Bot,
  Mail,
  Phone,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout, getAdminEmail } from "@/stores/authStore";
import Logo, { LogoMark } from "@/components/Logo";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/pipeline", label: "Pipeline", icon: Kanban },
  { to: "/admin/mensagens", label: "Mensagens", icon: MessageSquare },
  { to: "/admin/negocios", label: "Negócios", icon: Store },
  { to: "/admin/leads", label: "Leads", icon: Users },
  { to: "/admin/corretores", label: "Corretores", icon: UserCheck },
  { to: "/admin/materiais", label: "Materiais", icon: Package },
  { to: "/admin/usuarios", label: "Usuários", icon: UserCog },
  { to: "/admin/social-selling", label: "Social Selling", icon: Instagram },
  { to: "/admin/marketing", label: "Email Marketing", icon: Mail },
  { to: "/admin/marketing/whatsapp", label: "WhatsApp Mkt", icon: Phone },
  { to: "/admin/integracoes", label: "Integrações", icon: Plug },
  { to: "/admin/agentes-ia", label: "Agentes IA", icon: Sparkles },
  { to: "/agentes", label: "Plataforma de Agentes", icon: Bot },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [adminEmail, setAdminEmail] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    getAdminEmail().then(setAdminEmail);
  }, []);

  // Fecha o drawer ao trocar de rota
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <Logo iconClassName="h-8 w-8" />
          <span className="ml-auto rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
            ADMIN
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.to ||
              (item.to !== "/admin" && location.pathname.startsWith(item.to + "/"));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="h-4.5 w-4.5" />
                {item.label}
                {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
              </Link>
            );
          })}
        </nav>

        {/* User / Logout */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              A
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">Administrador</p>
              <p className="text-xs text-muted-foreground truncate">{adminEmail}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full justify-start gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
            onClick={() => navigate("/corretor/dashboard")}
          >
            <UserCheckIcon className="h-4 w-4" />
            Entrar como Corretor
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Mobile Drawer (overlay + painel deslizante) */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border shadow-xl flex flex-col animate-in slide-in-from-left duration-200">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <Logo iconClassName="h-7 w-7" />
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {item.label}
                    {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-border p-3 space-y-1">
              <div className="flex items-center gap-2 px-3 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">A</div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">Administrador</p>
                  <p className="text-[10px] text-muted-foreground truncate">{adminEmail}</p>
                </div>
              </div>
              <button
                onClick={() => navigate("/corretor/dashboard")}
                className="flex w-full items-center gap-2 rounded-lg border border-primary/30 px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/10"
              >
                <UserCheckIcon className="h-4 w-4" /> Entrar como Corretor
              </button>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-destructive"
              >
                <LogOut className="h-4 w-4" /> Sair
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header — hamburger + logo + perfil */}
        <header className="md:hidden flex h-14 items-center justify-between border-b border-border bg-card px-3 sticky top-0 z-40">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground hover:bg-muted"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <LogoMark className="h-7 w-7" />
            <span className="font-display text-sm font-bold">Admin</span>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary" aria-label="Perfil">
            A
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
