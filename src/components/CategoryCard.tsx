import { Link } from "react-router-dom";
import {
  UtensilsCrossed,
  Heart,
  Briefcase,
  ShoppingBag,
  Laptop,
  GraduationCap,
  Car,
  Factory,
  Building2,
  LucideIcon,
} from "lucide-react";

interface CategoryCardProps {
  id: string;
  nome: string;
  icone: string;
}

const iconMap: Record<string, LucideIcon> = {
  UtensilsCrossed,
  Heart,
  Briefcase,
  ShoppingBag,
  Laptop,
  GraduationCap,
  Car,
  Factory,
  Building2,
};

const CategoryCard = ({ id, nome, icone }: CategoryCardProps) => {
  const Icon = iconMap[icone] || Briefcase;

  return (
    <Link
      to={`/busca?categoria=${id}`}
      className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 text-center shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 hover:border-primary/30"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary transition-colors group-hover:bg-primary">
        <Icon className="h-7 w-7 text-secondary-foreground transition-colors group-hover:text-primary-foreground" />
      </div>
      <span className="font-medium text-foreground">{nome}</span>
    </Link>
  );
};

export default CategoryCard;
