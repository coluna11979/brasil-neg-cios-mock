import { cn } from "@/lib/utils";

interface LogoProps {
  /** Mostra o texto "NegociaAky" ao lado do ícone */
  showText?: boolean;
  /** Mostra o slogan abaixo do nome */
  showTagline?: boolean;
  /** Cor do texto quando sobre fundo escuro */
  variant?: "default" | "light";
  className?: string;
  iconClassName?: string;
}

export const LogoMark = ({ className }: { className?: string }) => {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-9 w-9", className)}
      role="img"
      aria-label="NegociaAky"
    >
      <defs>
        <linearGradient id="naky-back" x1="14" y1="52" x2="40" y2="14" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0A5BE6" />
          <stop offset="1" stopColor="#2D9BFF" />
        </linearGradient>
        <linearGradient id="naky-front" x1="30" y1="52" x2="54" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E8BFF" />
          <stop offset="1" stopColor="#00E6FF" />
        </linearGradient>
      </defs>
      {/* fita de trás: perna esquerda, arco arredondado (∩) e desce ao vale central */}
      <path
        d="M16 50 L16 27 C16 13 34 13 34 27 L34 47"
        stroke="url(#naky-back)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* fita da frente: do vale sobe em diagonal ao topo direito */}
      <path
        d="M34 47 L50 15"
        stroke="url(#naky-front)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="50" r="5.5" fill="#0A5BE6" />
      <circle cx="50" cy="15" r="5.5" fill="#00E6FF" />
    </svg>
  );
};

const Logo = ({
  showText = true,
  showTagline = false,
  variant = "default",
  className,
  iconClassName,
}: LogoProps) => {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoMark className={iconClassName} />
      {showText && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-xl font-bold tracking-tight">
            <span className={variant === "light" ? "text-white" : "text-foreground"}>Negocia</span>
            <span className="text-primary">Aky</span>
          </span>
          {showTagline && (
            <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-accent">
              Conecta. Negocia. Realiza.
            </span>
          )}
        </span>
      )}
    </span>
  );
};

export default Logo;
