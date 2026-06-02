import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2, Home, LayoutGrid, Award, Megaphone, Briefcase,
  MessageCircle, Instagram, ExternalLink, Sparkles, CheckCircle2,
  TrendingUp,
} from "lucide-react";
import usePageTitle from "@/hooks/usePageTitle";
import { getEmpresaConfig, type EmpresaConfig } from "@/lib/empresaConfig";

/**
 * Página /links — versão "linktree" da NegociaAky.
 * Pensada pra ser o link da bio do Instagram. Mobile-first,
 * brand-aligned, com captura de clique por seção.
 */

interface LinkItem {
  label: string;
  description?: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  external?: boolean;
  primary?: boolean;
  color?: string; // tailwind gradient classes
}

const Links = () => {
  usePageTitle("NegociaAky — Onde negócios acontecem");
  const [empresa, setEmpresa] = useState<EmpresaConfig | null>(null);

  useEffect(() => {
    getEmpresaConfig().then(setEmpresa);
  }, []);

  const waNumber = (empresa?.whatsapp || "").replace(/\D/g, "");
  const waHref = waNumber
    ? `https://wa.me/55${waNumber}?text=${encodeURIComponent("Olá! Cheguei pelo Instagram da NegociaAky 👋")}`
    : "https://wa.me/?text=Olá!%20Cheguei%20pelo%20Instagram%20da%20NegociaAky";

  // ── Links principais (categorias de busca) ─────────────────────────────
  const buscar: LinkItem[] = [
    {
      label: "Negócios à venda",
      description: "Empresas em funcionamento, todos os portes",
      href: "/busca?tipo=negocio",
      icon: Building2,
    },
    {
      label: "Imóveis comerciais",
      description: "Lojas, salas, galpões, prédios",
      href: "/imoveis",
      icon: Home,
    },
    {
      label: "Galerias com pontos para locar",
      description: "Galerias prontas pra você abrir sua loja",
      href: "/galerias",
      icon: LayoutGrid,
    },
    {
      label: "Franquias",
      description: "Marcas consagradas pra franquear",
      href: "/busca?tipo=franquia",
      icon: Award,
    },
  ];

  // ── CTA destaque ───────────────────────────────────────────────────────
  const ctaPrincipal: LinkItem = {
    label: "QUERO VENDER MEU NEGÓCIO",
    description: "Anuncie grátis em 3 minutos",
    href: "/anunciar",
    icon: Megaphone,
    primary: true,
  };

  // ── Links secundários ──────────────────────────────────────────────────
  const secundarios: LinkItem[] = [
    {
      label: "Seja um corretor parceiro",
      description: "Comissão atrativa + leads quentes",
      href: "/seja-corretor",
      icon: Briefcase,
    },
    {
      label: "Falar no WhatsApp",
      description: "Tire dúvidas com nosso time",
      href: waHref,
      icon: MessageCircle,
      external: true,
      color: "from-green-500 to-emerald-500",
    },
  ];

  const instaHref = empresa?.instagram
    ? `https://instagram.com/${empresa.instagram.replace(/^@/, "")}`
    : "https://instagram.com/";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0D1117] via-[#0a1535] to-[#0D1117] relative overflow-hidden">
      {/* Glow decorativo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#007BFF]/20 blur-[120px]" />
        <div className="absolute top-[40%] -right-32 w-[400px] h-[400px] rounded-full bg-[#00E6FF]/15 blur-[100px]" />
      </div>

      {/* ─── BANNER TOPO: Versículo ──────────────────────────────────────── */}
      <div className="relative bg-gradient-to-r from-[#007BFF] via-[#00B4FF] to-[#00E6FF] text-white shadow-lg">
        <div className="max-w-md mx-auto px-4 py-2.5 flex items-center justify-center gap-2 text-center">
          <Sparkles className="h-3.5 w-3.5 shrink-0 opacity-90" />
          <p className="text-xs sm:text-sm font-medium">
            <em>"Tudo é possível ao que crê."</em>
            <span className="font-bold tracking-wider ml-1.5 opacity-95"> MC 9:23</span>
          </p>
        </div>
      </div>

      <div className="relative max-w-md mx-auto px-5 pt-10 pb-16">
        {/* ─── Header com marca ──────────────────────────────────────────── */}
        <header className="text-center mb-8">
          <img
            src="/logo-icon.png"
            alt="NegociaAky"
            className="h-20 w-20 mx-auto mb-4 drop-shadow-[0_0_30px_rgba(0,230,255,0.4)]"
          />
          <h1 className="font-display text-3xl font-extrabold text-white tracking-tight">
            Negocia<span className="text-[#00E6FF]">Aky</span>
          </h1>
          <p className="text-xs font-semibold text-[#00E6FF] tracking-[0.3em] mt-1">
            CONECTA • NEGOCIA • REALIZA
          </p>

          <p className="text-base text-white/90 mt-5 leading-relaxed font-semibold">
            Acreditamos no seu próximo negócio.
          </p>
          <p className="text-sm text-white/60 mt-1.5 leading-relaxed">
            Aqui quem <strong className="text-white/85">sonha em empreender</strong> encontra<br />
            o caminho de quem está pronto pra <strong className="text-white/85">passar o bastão</strong>.
          </p>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="flex items-center gap-1 rounded-full bg-white/10 border border-white/20 px-2.5 py-1 text-[10px] font-bold text-white/90">
              <CheckCircle2 className="h-3 w-3 text-[#00E6FF]" />
              Sigilo garantido
            </span>
            <span className="flex items-center gap-1 rounded-full bg-white/10 border border-white/20 px-2.5 py-1 text-[10px] font-bold text-white/90">
              <Sparkles className="h-3 w-3 text-[#00E6FF]" />
              Corretores certificados
            </span>
          </div>
        </header>

        {/* ─── CTA Principal ───────────────────────────────────────────── */}
        <Link
          to={ctaPrincipal.href}
          className="block mb-5 rounded-2xl bg-gradient-to-r from-[#007BFF] to-[#00E6FF] p-[2px] shadow-[0_8px_30px_rgba(0,230,255,0.25)] active:scale-[0.98] transition-transform"
        >
          <div className="rounded-2xl bg-gradient-to-r from-[#007BFF] to-[#00E6FF] px-5 py-4 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <ctaPrincipal.icon className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-white leading-tight text-base">
                {ctaPrincipal.label}
              </p>
              <p className="text-xs text-white/85 mt-0.5">{ctaPrincipal.description}</p>
            </div>
            <ExternalLink className="h-5 w-5 text-white/80 shrink-0" />
          </div>
        </Link>

        {/* ─── CTA Secundário: Oportunidades (vê todos os anúncios) ──── */}
        <Link
          to="/busca"
          className="block mb-5 rounded-2xl bg-white/[0.07] backdrop-blur-sm border-2 border-[#00E6FF]/40 hover:bg-white/[0.10] active:bg-white/[0.13] active:scale-[0.98] transition-all p-[2px] shadow-[0_0_25px_rgba(0,230,255,0.15)]"
        >
          <div className="rounded-2xl px-5 py-4 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#00E6FF]/30 to-[#007BFF]/30 border border-[#00E6FF]/40">
              <TrendingUp className="h-6 w-6 text-[#00E6FF]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-white leading-tight text-base tracking-wide">
                OPORTUNIDADES
              </p>
              <p className="text-xs text-white/65 mt-0.5">
                Veja todos os anúncios disponíveis agora
              </p>
            </div>
            <ExternalLink className="h-5 w-5 text-[#00E6FF] shrink-0" />
          </div>
        </Link>

        {/* ─── Seção: Buscar por categoria ───────────────────────────── */}
        <div className="mb-5">
          <p className="text-[10px] font-bold text-white/50 tracking-[0.2em] uppercase mb-2.5 px-1">
            Ou explore por categoria
          </p>
          <div className="space-y-2.5">
            {buscar.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className="block rounded-xl bg-white/[0.07] backdrop-blur-sm border border-white/10 hover:bg-white/[0.12] active:bg-white/[0.15] active:scale-[0.98] transition-all p-4"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#007BFF]/30 to-[#00E6FF]/20 border border-[#00E6FF]/20">
                      <Icon className="h-5 w-5 text-[#00E6FF]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-sm leading-tight">{item.label}</p>
                      {item.description && (
                        <p className="text-[11px] text-white/60 mt-0.5">{item.description}</p>
                      )}
                    </div>
                    <ExternalLink className="h-4 w-4 text-white/40 shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ─── Seção: Outros ───────────────────────────────────────────── */}
        <div className="mb-8">
          <p className="text-[10px] font-bold text-white/50 tracking-[0.2em] uppercase mb-2.5 px-1">
            Mais
          </p>
          <div className="space-y-2.5">
            {secundarios.map((item) => {
              const Icon = item.icon;
              const inner = (
                <div className="flex items-center gap-3.5">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
                      item.color
                        ? `bg-gradient-to-br ${item.color}`
                        : "bg-white/10 border border-white/15"
                    }`}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm leading-tight">{item.label}</p>
                    {item.description && (
                      <p className="text-[11px] text-white/60 mt-0.5">{item.description}</p>
                    )}
                  </div>
                  <ExternalLink className="h-4 w-4 text-white/40 shrink-0" />
                </div>
              );
              return item.external ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl bg-white/[0.07] backdrop-blur-sm border border-white/10 hover:bg-white/[0.12] active:bg-white/[0.15] active:scale-[0.98] transition-all p-4"
                >
                  {inner}
                </a>
              ) : (
                <Link
                  key={item.href}
                  to={item.href}
                  className="block rounded-xl bg-white/[0.07] backdrop-blur-sm border border-white/10 hover:bg-white/[0.12] active:bg-white/[0.15] active:scale-[0.98] transition-all p-4"
                >
                  {inner}
                </Link>
              );
            })}
          </div>
        </div>

        {/* ─── Footer ──────────────────────────────────────────────────── */}
        <footer className="text-center pt-6 border-t border-white/10">
          {empresa?.instagram && (
            <a
              href={instaHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 px-4 py-2 text-xs font-bold text-white shadow-lg active:scale-95 transition-transform mb-4"
            >
              <Instagram className="h-3.5 w-3.5" />
              @{empresa.instagram.replace(/^@/, "")}
            </a>
          )}
          <p className="text-[10px] text-white/40 leading-relaxed">
            © {new Date().getFullYear()} NegociaAky · Plataforma de Compra e Venda de Negócios
          </p>
          <Link
            to="/"
            className="inline-block text-[10px] text-[#00E6FF]/80 hover:text-[#00E6FF] mt-2 underline-offset-2 hover:underline"
          >
            negociaaky.com.br
          </Link>
        </footer>
      </div>
    </div>
  );
};

export default Links;
