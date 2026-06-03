/**
 * Renderiza uma <img> com legendas opcionais sobreposta:
 *  - Etiqueta principal (canto superior esquerdo): texto curto + cor.
 *  - Preço em destaque (canto inferior direito).
 *
 * Pensado pra cards de listagem E hero de detalhe (Anuncio.tsx).
 */
import React from "react";

export type BadgeCor = "green" | "blue" | "red" | "amber" | "violet" | "slate";

const BADGE_COLORS: Record<BadgeCor, string> = {
  green:  "bg-green-500 text-white",
  blue:   "bg-blue-500 text-white",
  red:    "bg-red-500 text-white",
  amber:  "bg-amber-500 text-white",
  violet: "bg-violet-500 text-white",
  slate:  "bg-slate-800 text-white",
};

interface Props {
  src: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  /** Texto curto (ex: "LOCAÇÃO", "PROMOÇÃO", "NOVO"). */
  badgeTexto?: string | null;
  badgeCor?: BadgeCor | null;
  /** Se true, exibe o `preco` formatado no canto inferior direito. */
  mostrarPreco?: boolean;
  preco?: number | null;
  precoSufixo?: string; // ex: "/mês" pra locação
}

function formatBRL(v: number): string {
  if (!v || v <= 0) return "";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

const ImagemComLegenda: React.FC<Props> = ({
  src,
  alt = "",
  className = "",
  imgClassName = "",
  badgeTexto,
  badgeCor = "green",
  mostrarPreco = false,
  preco,
  precoSufixo,
}) => {
  const corClass = BADGE_COLORS[badgeCor || "green"] ?? BADGE_COLORS.green;
  const temBadge = !!badgeTexto?.trim();
  const temPreco = mostrarPreco && !!preco && preco > 0;

  return (
    <div className={`relative ${className}`}>
      <img src={src} alt={alt} className={imgClassName} loading="lazy" />

      {/* Etiqueta principal — canto superior esquerdo */}
      {temBadge && (
        <span
          className={`absolute top-3 left-3 ${corClass} rounded-md px-3 py-1 text-xs sm:text-sm font-bold tracking-wider uppercase shadow-lg`}
          style={{ letterSpacing: "0.08em" }}
        >
          {badgeTexto}
        </span>
      )}

      {/* Preço em destaque — canto inferior direito */}
      {temPreco && (
        <div className="absolute bottom-3 right-3 rounded-md bg-white/95 backdrop-blur px-3 py-2 shadow-lg">
          <p className="text-base sm:text-lg font-bold text-foreground leading-none whitespace-nowrap">
            {formatBRL(preco!)}{precoSufixo && <span className="text-xs font-medium text-muted-foreground">{precoSufixo}</span>}
          </p>
        </div>
      )}
    </div>
  );
};

export default ImagemComLegenda;
