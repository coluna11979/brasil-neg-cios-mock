import { Link } from "react-router-dom";
import { Building2, Menu, X, Heart, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { useBuyer } from "@/contexts/BuyerContext";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { session, favorites, openAuthModal, signOut } = useBuyer();
  const userMenuRef = useRef<HTMLDivElement>(null);

  const nome: string = session?.user?.user_metadata?.nome || session?.user?.email?.split("@")[0] || "Usuário";
  const iniciais = nome.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container-app">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">
              NegociaAky
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              to="/busca"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Negócios
            </Link>
            <Link
              to="/imoveis"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Imóveis
            </Link>
            <Link
              to="/galerias"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Galerias
            </Link>
          </nav>

          {/* CTA Buttons */}
          <div className="hidden items-center gap-3 md:flex">
            <Button asChild variant="outline" className="font-semibold">
              <Link to="/seja-corretor">Seja um Corretor</Link>
            </Button>

            {session ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {iniciais}
                  </div>
                  <span className="max-w-[100px] truncate">{nome.split(" ")[0]}</span>
                  {favorites.length > 0 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {favorites.length}
                    </span>
                  )}
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-border bg-card shadow-lg overflow-hidden z-50">
                    <Link
                      to="/meus-favoritos"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-muted transition-colors"
                    >
                      <Heart className="h-4 w-4 text-red-500" />
                      Meus Favoritos
                      {favorites.length > 0 && (
                        <span className="ml-auto text-xs font-semibold text-muted-foreground">{favorites.length}</span>
                      )}
                    </Link>
                    <div className="border-t border-border" />
                    <button
                      type="button"
                      onClick={() => { signOut(); setUserMenuOpen(false); }}
                      className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button variant="outline" className="font-semibold gap-1.5" onClick={openAuthModal}>
                <Heart className="h-4 w-4" />
                Entrar
              </Button>
            )}

            <Button asChild variant="default" className="font-semibold">
              <Link to="/anunciar">Anunciar</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Abrir menu de navegação"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div id="mobile-menu" className="border-t border-border py-4 md:hidden">
            <nav className="flex flex-col gap-2">
              <Link
                to="/busca"
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Negócios
              </Link>
              <Link
                to="/imoveis"
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Imóveis
              </Link>
              <Link
                to="/galerias"
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Galerias
              </Link>
              <Link
                to="/seja-corretor"
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Seja um Corretor
              </Link>
              {session ? (
                <>
                  <Link
                    to="/meus-favoritos"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Heart className="h-4 w-4 text-red-500" />
                    Meus Favoritos {favorites.length > 0 && `(${favorites.length})`}
                  </Link>
                  <button
                    type="button"
                    onClick={() => { signOut(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => { openAuthModal(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Heart className="h-4 w-4" />
                  Entrar / Criar conta
                </button>
              )}
              <Button asChild variant="default" className="mt-2 font-semibold">
                <Link to="/anunciar" onClick={() => setMobileMenuOpen(false)}>
                  Anunciar
                </Link>
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
