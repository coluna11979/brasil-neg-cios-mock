import { MessageCircle, Phone } from "lucide-react";

interface StickyMobileCTAProps {
  onContact: () => void;
  preco: string;
  tipo?: string;
}

const StickyMobileCTA = ({ onContact, preco, tipo }: StickyMobileCTAProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-sm p-3 md:hidden safe-area-bottom">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">
            {tipo === "aluguel-imovel" ? "Aluguel/mês" : "Valor"}
          </p>
          <p className="font-display text-lg font-bold text-primary truncate">
            {preco}
          </p>
        </div>
        <button
          onClick={onContact}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
        >
          <MessageCircle className="h-4 w-4" />
          Tenho Interesse
        </button>
      </div>
    </div>
  );
};

export default StickyMobileCTA;
