import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  initialValue?: string;
  onSearch?: (query: string) => void;
  size?: "default" | "large";
}

const SearchBar = ({ initialValue = "", onSearch, size = "default" }: SearchBarProps) => {
  const [query, setQuery] = useState(initialValue);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(query);
    } else {
      navigate(`/busca?q=${encodeURIComponent(query)}`);
    }
  };

  const isLarge = size === "large";

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div
        className={`flex items-center gap-2 rounded-xl border border-border bg-card shadow-card ${
          isLarge ? "p-2" : "p-1"
        }`}
      >
        <div className="flex flex-1 items-center gap-3 px-3">
          <Search
            className={`text-muted-foreground ${isLarge ? "h-5 w-5" : "h-4 w-4"}`}
          />
          <input
            type="text"
            placeholder="Buscar por tipo de negócio, cidade ou palavra-chave..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`flex-1 bg-transparent outline-none placeholder:text-muted-foreground ${
              isLarge ? "text-base py-3" : "text-sm py-2"
            }`}
          />
        </div>
        <Button
          type="submit"
          className={`shrink-0 font-semibold ${isLarge ? "px-6 py-3 text-base" : ""}`}
        >
          Buscar
        </Button>
      </div>
    </form>
  );
};

export default SearchBar;
