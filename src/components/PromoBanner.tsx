import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, Store, Award, TrendingUp } from "lucide-react";

const SLIDES = [
  {
    id: 1,
    tag: "Esta semana",
    titulo: "Espaços em Galerias Disponíveis",
    desc: "Lojas, salas e boxes em galerias comerciais no centro de SP.",
    cta: "Ver galerias",
    href: "/galerias",
    icon: Building2,
    bg: "from-teal-600 to-teal-800",
  },
  {
    id: 2,
    tag: "Oportunidade",
    titulo: "Negócios à Venda em São Paulo",
    desc: "Comércios, restaurantes e empresas prontos para assumir.",
    cta: "Explorar negócios",
    href: "/busca",
    icon: Store,
    bg: "from-primary to-primary/80",
  },
  {
    id: 3,
    tag: "Destaque",
    titulo: "Franquias com Alto Potencial",
    desc: "Marcas consolidadas buscando franqueados em SP.",
    cta: "Ver franquias",
    href: "/busca?tipo=franquia",
    icon: Award,
    bg: "from-orange-500 to-orange-700",
  },
  {
    id: 4,
    tag: "Parceria",
    titulo: "Seja um Corretor NegociaAky",
    desc: "Trabalhe com autonomia e ganhe comissões atrativas em SP.",
    cta: "Quero ser corretor",
    href: "/seja-corretor",
    icon: TrendingUp,
    bg: "from-slate-700 to-slate-900",
  },
];

const PromoBanner = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const slide = SLIDES[current];
  const Icon = slide.icon;

  return (
    <div className="relative overflow-hidden">
      <div
        className={`bg-gradient-to-r ${slide.bg} transition-all duration-700`}
      >
        <div className="container-app py-6 md:py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-widest text-white/60">
                  {slide.tag}
                </span>
                <p className="font-display text-lg font-bold text-white leading-tight">
                  {slide.titulo}
                </p>
                <p className="mt-0.5 text-sm text-white/70 hidden sm:block">{slide.desc}</p>
              </div>
            </div>
            <Link
              to={slide.href}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-white/15 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/25 transition-colors border border-white/20"
            >
              {slide.cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Dots */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === current ? "w-5 bg-white" : "w-1.5 bg-white/40"
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default PromoBanner;
