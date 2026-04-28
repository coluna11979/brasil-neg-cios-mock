import { Sparkles } from "lucide-react";

/**
 * Frase de fé do ecossistema NegociaAky.
 * Aparece sutilmente em pontos estratégicos: footer, telas de login,
 * confirmações e saudação do dashboard.
 */
export const FAITH_QUOTE = "Tudo é possível àquele que crê";
export const FAITH_REF   = "Marcos 9:23";

interface Props {
  /** Variação visual:
   *   - `dark`    → para fundos escuros (footer)
   *   - `light`   → para fundos claros (login, confirmações)
   *   - `muted`   → versão discreta (saudação, rodapé interno)
   */
  variant?: "dark" | "light" | "muted";
  /** Esconder a referência bíblica */
  hideRef?: boolean;
  className?: string;
}

const FaithQuote = ({ variant = "light", hideRef = false, className = "" }: Props) => {
  const styles =
    variant === "dark"  ? { quote: "text-white/70",       ref: "text-white/30",       icon: "text-primary/80" } :
    variant === "muted" ? { quote: "text-muted-foreground",ref: "text-muted-foreground/60", icon: "text-primary/60" } :
                          { quote: "text-foreground/80", ref: "text-muted-foreground", icon: "text-primary" };

  return (
    <div className={`flex items-center justify-center gap-2 text-center ${className}`}>
      <Sparkles className={`h-3.5 w-3.5 shrink-0 ${styles.icon}`} aria-hidden />
      <p className={`text-xs italic ${styles.quote}`}>
        “{FAITH_QUOTE}”
        {!hideRef && (
          <span className={`ml-1.5 not-italic font-medium ${styles.ref}`}>
            — {FAITH_REF}
          </span>
        )}
      </p>
    </div>
  );
};

export default FaithQuote;
