import {
  Apple,
  Baby,
  Bike,
  BookOpen,
  Brain,
  Briefcase,
  Calendar,
  Camera,
  Car,
  ChartLine,
  Clock,
  Code,
  Coffee,
  Dumbbell,
  Flag,
  Folder,
  FolderCheck,
  FolderClock,
  FolderCode,
  FolderHeart,
  FolderKanban,
  FolderLock,
  FolderOpen,
  Gamepad2,
  Gift,
  GraduationCap,
  Hammer,
  Heart,
  HeartPulse,
  House,
  Laptop,
  Leaf,
  Library,
  Lightbulb,
  Moon,
  Music,
  NotebookPen,
  Palette,
  PawPrint,
  PiggyBank,
  Pill,
  Plane,
  Rocket,
  ShoppingCart,
  Sparkles,
  Sprout,
  Star,
  Stethoscope,
  Sun,
  Target,
  Trophy,
  Users,
  Utensils,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Drawn icons a folder can use, saved as "lucide:<key>" next to the emoji ones. */
export const FOLDER_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  "folder-heart": { icon: FolderHeart, label: "Pasta com coração" },
  "folder-kanban": { icon: FolderKanban, label: "Pasta de quadro" },
  "folder-check": { icon: FolderCheck, label: "Pasta concluída" },
  "folder-clock": { icon: FolderClock, label: "Pasta com relógio" },
  "folder-code": { icon: FolderCode, label: "Pasta de código" },
  "folder-lock": { icon: FolderLock, label: "Pasta trancada" },
  briefcase: { icon: Briefcase, label: "Trabalho" },
  laptop: { icon: Laptop, label: "Computador" },
  chart: { icon: ChartLine, label: "Gráfico" },
  target: { icon: Target, label: "Meta" },
  rocket: { icon: Rocket, label: "Projeto" },
  lightbulb: { icon: Lightbulb, label: "Ideias" },
  graduation: { icon: GraduationCap, label: "Faculdade" },
  book: { icon: BookOpen, label: "Livro" },
  library: { icon: Library, label: "Biblioteca" },
  notebook: { icon: NotebookPen, label: "Caderno" },
  brain: { icon: Brain, label: "Mente" },
  code: { icon: Code, label: "Código" },
  house: { icon: House, label: "Casa" },
  cart: { icon: ShoppingCart, label: "Compras" },
  utensils: { icon: Utensils, label: "Cozinha" },
  coffee: { icon: Coffee, label: "Café" },
  wrench: { icon: Wrench, label: "Consertos" },
  hammer: { icon: Hammer, label: "Obras" },
  wallet: { icon: Wallet, label: "Carteira" },
  piggy: { icon: PiggyBank, label: "Economias" },
  heart: { icon: Heart, label: "Coração" },
  pulse: { icon: HeartPulse, label: "Saúde" },
  stethoscope: { icon: Stethoscope, label: "Médico" },
  pill: { icon: Pill, label: "Remédios" },
  dumbbell: { icon: Dumbbell, label: "Academia" },
  bike: { icon: Bike, label: "Bicicleta" },
  apple: { icon: Apple, label: "Alimentação" },
  sprout: { icon: Sprout, label: "Plantas" },
  leaf: { icon: Leaf, label: "Natureza" },
  users: { icon: Users, label: "Família" },
  baby: { icon: Baby, label: "Bebê" },
  paw: { icon: PawPrint, label: "Pet" },
  plane: { icon: Plane, label: "Viagem" },
  car: { icon: Car, label: "Carro" },
  music: { icon: Music, label: "Música" },
  palette: { icon: Palette, label: "Arte" },
  camera: { icon: Camera, label: "Fotos" },
  game: { icon: Gamepad2, label: "Jogos" },
  calendar: { icon: Calendar, label: "Agenda" },
  clock: { icon: Clock, label: "Horário" },
  gift: { icon: Gift, label: "Presentes" },
  flag: { icon: Flag, label: "Bandeira" },
  trophy: { icon: Trophy, label: "Conquistas" },
  star: { icon: Star, label: "Estrela" },
  sparkles: { icon: Sparkles, label: "Brilho" },
  sun: { icon: Sun, label: "Sol" },
  moon: { icon: Moon, label: "Lua" },
};

export const LUCIDE = "lucide:";

/** No icon chosen (or the old 📁 default): the drawn folder, closed or open. */
export const isDefaultFolderIcon = (icon?: string) => !icon || icon === "📁" || icon === "📂";

/** A folder's icon in the sidebar: the tinted drawn folder by default, a drawn icon, or an emoji. */
export function FolderGlyph({ icon, open, className }: { icon?: string; open?: boolean; className?: string }) {
  if (icon?.startsWith(LUCIDE)) {
    const Icon = FOLDER_ICONS[icon.slice(LUCIDE.length)]?.icon ?? Folder;
    return <Icon aria-hidden="true" className={cn("text-primary-strong", className)} />;
  }
  if (isDefaultFolderIcon(icon)) {
    const Icon = open ? FolderOpen : Folder;
    return <Icon aria-hidden="true" className={cn("fill-primary/15 text-primary-strong", className)} />;
  }
  return (
    <span aria-hidden="true" className={cn("w-5 text-center text-base leading-none", className)}>
      {icon}
    </span>
  );
}
