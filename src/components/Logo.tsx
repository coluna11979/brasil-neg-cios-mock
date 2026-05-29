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
    <img
      src="/logo-icon.png"
      alt="NegociaAky"
      className={cn("h-9 w-9 object-contain", className)}
      draggable={false}
    />
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
