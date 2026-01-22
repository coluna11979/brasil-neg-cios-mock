import { Link } from "react-router-dom";
import { MapPin, TrendingUp } from "lucide-react";
import { Listing, formatCurrency, getCategoryName } from "@/data/mockListings";

interface ListingCardProps {
  listing: Listing;
}

const ListingCard = ({ listing }: ListingCardProps) => {
  return (
    <Link
      to={`/anuncio/${listing.id}`}
      className="group block overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1"
    >
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={listing.imagem}
          alt={listing.titulo}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {listing.destaque && (
          <div className="absolute left-3 top-3 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            Destaque
          </div>
        )}
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

        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
          {listing.descricao}
        </p>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <div>
            <p className="text-xs text-muted-foreground">Valor do Negócio</p>
            <p className="font-display text-lg font-bold text-primary">
              {formatCurrency(listing.preco)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Faturamento/mês</p>
            <div className="flex items-center gap-1 text-success">
              <TrendingUp className="h-4 w-4" />
              <span className="font-semibold">
                {formatCurrency(listing.faturamentoMensal)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ListingCard;
