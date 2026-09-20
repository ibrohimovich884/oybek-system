import {
  Utensils,
  Car,
  Coffee,
  ShoppingBag,
  Home,
  GraduationCap,
  HeartPulse,
  Gamepad2,
  Package,
  Briefcase,
  Sparkles,
  Laptop,
  Gift,
  TrendingUp,
  Coins,
  ArrowRightLeft,
  HelpCircle,
} from "lucide-react";

const ICON_MAP = {
  Utensils,
  Car,
  Coffee,
  ShoppingBag,
  Home,
  GraduationCap,
  HeartPulse,
  Gamepad2,
  Package,
  Briefcase,
  Sparkles,
  Laptop,
  Gift,
  TrendingUp,
  Coins,
  ArrowRightLeft,
};

export default function CategoryIcon({ iconName, color = "#a39c8e", size = 16, className = "" }) {
  const IconComponent = ICON_MAP[iconName] || HelpCircle;
  return <IconComponent size={size} style={{ color }} className={className} />;
}
