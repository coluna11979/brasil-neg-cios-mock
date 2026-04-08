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

const colorMap: Record<string, { bg: string; icon: string; glow: string }> = {
  UtensilsCrossed: { bg: "bg-orange-50", icon: "text-orange-500", glow: "group-hover:bg-orange-500" },
  Heart:           { bg: "bg-rose-50",   icon: "text-rose-500",   glow: "group-hover:bg-rose-500" },
  Briefcase:       { bg: "bg-blue-50",   icon: "text-blue-500",   glow: "group-hover:bg-blue-500" },
  ShoppingBag:     { bg: "bg-violet-50", icon: "text-violet-500", glow: "group-hover:bg-violet-500" },
  Laptop:          { bg: "bg-cyan-50",   icon: "text-cyan-500",   glow: "group-hover:bg-cyan-500" },
  GraduationCap:   { bg: "bg-amber-50",  icon: "text-amber-500",  glow: "group-hover:bg-amber-500" },
  Car:             { bg: "bg-slate-100",  icon: "text-slate-500",  glow: "group-hover:bg-slate-500" },
  Factory:         { bg: "bg-emerald-50", icon: "text-emerald-500", glow: "group-hover:bg-emerald-500" },
  Building2:       { bg: "bg-teal-50",   icon: "text-teal-500",   glow: "group-hover:bg-teal-500" },
};

const CategoryCard = ({ id, nome, icone }: CategoryCardProps) => {
  const Icon = iconMap[icone] || Briefcase;
  const colors = colorMap[icone] || { bg: "bg-secondary", icon: "text-secondary-foreground", glow: "group-hover:bg-primary" };

  return (
    <Link
      to={`/busca?categoria=${id}`}
      className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-transparent"
    >
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-2xl ${colors.bg} ${colors.glow} transition-all duration-300`}
      >
        <Icon
          className={`h-8 w-8 ${colors.icon} transition-colors duration-300 group-hover:text-white`}
          strokeWidth={1.5}
        />
      </div>
      <span className="text-sm font-semibold text-foreground leading-tight">{nome}</span>
    </Link>
  );
};

export default CategoryCard;
