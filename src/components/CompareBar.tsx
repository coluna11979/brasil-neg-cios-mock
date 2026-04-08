import { useNavigate } from "react-router-dom";
import { GitCompareArrows, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompare } from "@/contexts/CompareContext";

const CompareBar = () => {
  const { compareIds, clearCompare } = useCompare();
  const navigate = useNavigate();

  if (compareIds.length < 2) return null;

  return (
    <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-3 shadow-xl">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <GitCompareArrows className="h-4 w-4 text-primary" />
          <span>
            <strong>{compareIds.length}</strong> negócio{compareIds.length > 1 ? "s" : ""} selecionado{compareIds.length > 1 ? "s" : ""}
          </span>
          {compareIds.length < 3 && (
            <span className="text-muted-foreground text-xs">
              (adicione até {3 - compareIds.length} mais)
            </span>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => navigate(`/comparar?ids=${compareIds.join(",")}`)}
          className="gap-1.5 font-semibold"
        >
          <GitCompareArrows className="h-3.5 w-3.5" />
          Comparar
        </Button>
        <button
          type="button"
          onClick={clearCompare}
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Limpar seleção"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default CompareBar;
