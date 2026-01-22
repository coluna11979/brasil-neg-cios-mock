import { Link } from "react-router-dom";
import { Building2 } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container-app py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Building2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold text-foreground">
                NegócioJá
              </span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              O maior marketplace de compra e venda de negócios do Brasil.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display text-sm font-semibold text-foreground">
              Para Compradores
            </h4>
            <ul className="mt-4 space-y-2">
              <li>
                <Link
                  to="/busca"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Buscar Negócios
                </Link>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">
                  Como Comprar
                </span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">
                  Financiamento
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold text-foreground">
              Para Vendedores
            </h4>
            <ul className="mt-4 space-y-2">
              <li>
                <Link
                  to="/anunciar"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Anunciar Negócio
                </Link>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">
                  Avaliar Negócio
                </span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">
                  Dicas de Venda
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold text-foreground">
              Suporte
            </h4>
            <ul className="mt-4 space-y-2">
              <li>
                <span className="text-sm text-muted-foreground">
                  Central de Ajuda
                </span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">
                  Fale Conosco
                </span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">
                  Termos de Uso
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-6">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} NegócioJá. Todos os direitos reservados.
            <span className="mx-2">•</span>
            <span className="text-accent font-medium">MVP - Versão de Demonstração</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
