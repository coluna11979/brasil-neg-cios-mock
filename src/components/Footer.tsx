import { Link } from "react-router-dom";
import { Building2, Mail, Instagram, Linkedin, Youtube, ArrowRight } from "lucide-react";
import { useState } from "react";
import { addLead } from "@/stores/leadStore";

const Footer = () => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    await addLead({
      nome: "Assinante Newsletter (Footer)",
      email,
      mensagem: "Inscrição via footer",
      origem: "newsletter",
    });
    localStorage.setItem("negocioja_subscribed", "true");
    setSubscribed(true);
    setEmail("");
  };

  return (
    <footer className="relative overflow-hidden bg-[hsl(215,25%,12%)] text-white">
      {/* Top wave decoration */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      {/* ── Mobile footer (compact) ── */}
      <div className="md:hidden container-app py-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-white">NegócioJá</span>
          </Link>
          <div className="flex items-center gap-2">
            <a href="#" className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/40 hover:bg-primary hover:text-white transition-all" aria-label="Instagram">
              <Instagram className="h-4 w-4" />
            </a>
            <a href="#" className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/40 hover:bg-primary hover:text-white transition-all" aria-label="LinkedIn">
              <Linkedin className="h-4 w-4" />
            </a>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
          <Link to="/busca" className="text-sm text-white/60 hover:text-white">Buscar</Link>
          <Link to="/anunciar" className="text-sm text-white/60 hover:text-white">Anunciar</Link>
          <Link to="/galerias" className="text-sm text-white/60 hover:text-white">Galerias</Link>
          <Link to="/seja-corretor" className="text-sm text-white/60 hover:text-white">Seja Corretor</Link>
        </div>
        <p className="mt-5 text-xs text-white/30">
          © {new Date().getFullYear()} NegócioJá · São Paulo, SP
        </p>
      </div>

      {/* ── Desktop footer (full) ── */}
      <div className="hidden md:block container-app pt-16 pb-8">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand + Newsletter */}
          <div className="lg:col-span-5">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
                <Building2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-2xl font-bold text-white">NegócioJá</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
              A plataforma #1 de compra, venda e locação de negócios do Brasil.
              Conectamos empreendedores a oportunidades reais todos os dias.
            </p>
            <div className="mt-8">
              <p className="text-sm font-semibold text-white/90">Receba oportunidades exclusivas</p>
              {subscribed ? (
                <p className="mt-3 text-sm text-green-400">Inscrito com sucesso!</p>
              ) : (
                <form onSubmit={handleNewsletter} className="mt-3 flex gap-2">
                  <input type="email" placeholder="Seu e-mail" value={email}
                    onChange={(e) => setEmail(e.target.value)} required
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                  <button type="submit"
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shrink-0">
                    Assinar <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">Plataforma</h4>
            <ul className="mt-5 space-y-3">
              <li><Link to="/busca" className="text-sm text-white/60 hover:text-white transition-colors">Oportunidades</Link></li>
              <li><Link to="/galerias" className="text-sm text-white/60 hover:text-white transition-colors">Espaços em Galerias</Link></li>
              <li><Link to="/anunciar" className="text-sm text-white/60 hover:text-white transition-colors">Anunciar Negócio</Link></li>
              <li><Link to="/seja-corretor" className="text-sm text-white/60 hover:text-white transition-colors">Seja um Corretor</Link></li>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">Categorias</h4>
            <ul className="mt-5 space-y-3">
              <li><Link to="/busca?categoria=alimentacao" className="text-sm text-white/60 hover:text-white transition-colors">Alimentação</Link></li>
              <li><Link to="/busca?categoria=saude-beleza" className="text-sm text-white/60 hover:text-white transition-colors">Saúde e Beleza</Link></li>
              <li><Link to="/busca?categoria=varejo" className="text-sm text-white/60 hover:text-white transition-colors">Varejo</Link></li>
              <li><Link to="/busca?categoria=tecnologia" className="text-sm text-white/60 hover:text-white transition-colors">Tecnologia</Link></li>
              <li><Link to="/busca?categoria=imoveis-comerciais" className="text-sm text-white/60 hover:text-white transition-colors">Imóveis Comerciais</Link></li>
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">Contato</h4>
            <ul className="mt-5 space-y-4">
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm text-white/60">contato@negocioja.com</span>
              </li>
            </ul>
            <div className="mt-6 flex items-center gap-3">
              <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white/40 hover:bg-primary hover:text-white transition-all" aria-label="Instagram"><Instagram className="h-4 w-4" /></a>
              <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white/40 hover:bg-primary hover:text-white transition-all" aria-label="LinkedIn"><Linkedin className="h-4 w-4" /></a>
              <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white/40 hover:bg-primary hover:text-white transition-all" aria-label="YouTube"><Youtube className="h-4 w-4" /></a>
            </div>
          </div>
        </div>

        <div className="mt-14 border-t border-white/10 pt-6 flex items-center justify-between gap-4">
          <p className="text-xs text-white/40">© {new Date().getFullYear()} NegócioJá. Todos os direitos reservados.</p>
          <div className="flex items-center gap-6 text-xs text-white/40">
            <span className="hover:text-white/60 cursor-pointer transition-colors">Termos de Uso</span>
            <span className="hover:text-white/60 cursor-pointer transition-colors">Política de Privacidade</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
