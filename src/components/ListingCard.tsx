import { Link } from "react-router-dom";
import { MapPin, TrendingUp, Home, Heart, GitCompareArrows } from "lucide-react";
import { Listing, formatCurrency, getCategoryName } from "@/data/mockListings";
import { Badge } from "@/components/ui/badge";
import { useBuyer } from "@/contexts/BuyerContext";
import { useCompare } from "@/contexts/CompareContext";

interface ListingCardProps {
  listing: Listing;
}

const ListingCard = ({ listing }: ListingCardProps) => {
  const isAluguel = listing.tipo === "aluguel-imovel";
  const isImovel = listing.tipo === "venda-imovel" || isAluguel;
  const { favorites, toggleFavorite } = useBuyer();
  const { toggleCompare, isComparing, compareIds } = useCompare();
  const isFav = favorites.includes(listing.id);
  const comparing = isComparing(listing.id);
  const compareDisabled = !comparing && compareIds.length >= 3;

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(listing.id);
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!compareDisabled) toggleCompare(listing.id);
  };

  return (
    <Link
      to={`/anuncio/${listing.id}`}
      className="group block overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1"
    >
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={listing.imagem}
          alt={`${listing.titulo} em ${listing.cidade}, ${listing.estado}`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex gap-2">
          {listing.destaque && (
            <div className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
              Destaque
            </div>
          )}
          {isImovel && (
            <Badge variant={isAluguel ? "secondary" : "default"} className="gap-1">
              <Home className="h-3 w-3" />
              {isAluguel ? "Aluguel" : "Venda"}
            </Badge>
          )}
        </div>

        {/* Botão favorito */}
        <button
          type="button"
          onClick={handleFavorite}
          aria-label={isFav ? "Remover dos favoritos" : "Salvar nos favoritos"}
          className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full shadow-md transition-all duration-200 ${
            isFav
              ? "bg-red-500 text-white scale-110"
              : "bg-white/90 text-muted-foreground hover:text-red-500 hover:scale-110"
          }`}
        >
          <Heart className={`h-4 w-4 ${isFav ? "fill-current" : ""}`} />
        </button>

        <div className="absolute bottom-3 left-3 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          {getCategoryName(listing.categoria)}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-display text-lg font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {listing.titulo}
        </h3>

        <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>
            {listing.cidade}, {listing.estado}
          </span>
        </div>

        {listing.areaM2 && (
          <p className="mt-1 text-sm text-muted-foreground">
            Área: {listing.areaM2} m²
          </p>
        )}

        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
          {listing.descricao}
        </p>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <div>
            <p className="text-xs text-muted-foreground">
              {isAluguel ? "Aluguel/mês" : "Valor do Negócio"}
            </p>
            <p className="font-display text-lg font-bold text-primary">
              {formatCurrency(listing.preco)}
            </p>
          </div>
          {listing.faturamentoMensal > 0 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Faturamento/mês</p>
              <div className="flex items-center gap-1 text-success">
                <TrendingUp className="h-4 w-4" />
                <span className="font-semibold">
                  {formatCurrency(listing.faturamentoMensal)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Botão comparar */}
        <button
          type="button"
          onClick={handleCompare}
          disabled={compareDisabled}
          className={`mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg border py-1.5 text-xs font-medium transition-colors ${
            comparing
              ? "border-primary bg-primary/10 text-primary"
              : compareDisabled
              ? "border-border text-muted-foreground/40 cursor-not-allowed"
              : "border-border text-muted-foreground hover:border-primary hover:text-primary"
          }`}
        >
          <GitCompareArrows className="h-3.5 w-3.5" />
          {comparing ? "Selecionado para comparar" : "Comparar"}
        </button>
      </div>
    </Link>
  );
};

export default ListingCard;
