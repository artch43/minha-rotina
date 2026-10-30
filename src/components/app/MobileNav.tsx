import { useRef } from "react";
import { CalendarDays, Home, Menu, NotebookPen, Sprout } from "lucide-react";
import { cn } from "@/lib/utils";
import { go, openNotes, useStore } from "@/store";
import { useSidebar } from "@/components/ui/sidebar";
import { useTrashDrag } from "./TrashDropZone";

/** Phone only: the main pages one tap away at the bottom; "Mais" opens the full menu (lists, settings). */
export function MobileNav() {
  const route = useStore((s) => s.ui.route);
  const pages = useStore((s) => s.ws.pages);
  const { setOpenMobile } = useSidebar();
  // Holding a dragged item over "Mais" opens the menu, so it can be dropped on the Lixeira there.
  const trashDrag = useTrashDrag();
  const springTimer = useRef<number>(undefined);
  const spring = {
    onDragEnter: (e: React.DragEvent) => {
      if (!trashDrag) return;
      e.preventDefault();
      clearTimeout(springTimer.current);
      springTimer.current = window.setTimeout(() => setOpenMobile(true), 450);
    },
    onDragOver: (e: React.DragEvent) => trashDrag && e.preventDefault(),
    onDragLeave: () => clearTimeout(springTimer.current),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      clearTimeout(springTimer.current);
    },
  };
  const id = (type: string) => pages.find((p) => p.type === type)?.id;
  const home = id("home"),
    cal = id("calendar"),
    habits = id("habits");
  const onBoard = pages.some((p) => p.id === route && p.type === "db");
  const items = [
    { label: "Início", icon: Home, active: route === home || !route, run: () => home && go(home) },
    { label: "Notas", icon: NotebookPen, active: route === "notes", run: () => openNotes() },
    { label: "Agenda", icon: CalendarDays, active: route === cal, run: () => cal && go(cal) },
    { label: "Hábitos", icon: Sprout, active: route === habits, run: () => habits && go(habits) },
    { label: "Mais", icon: Menu, active: onBoard, run: () => setOpenMobile(true) },
  ];
  return (
    <nav
      aria-label="Navegação principal"
      className="sticky bottom-0 z-20 grid grid-cols-5 border-t bg-background/92 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-backdrop-filter:bg-background/80 md:hidden"
    >
      {items.map((it) => (
        <button
          key={it.label}
          type="button"
          aria-current={it.active ? "page" : undefined}
          onClick={it.run}
          {...(it.label === "Mais" ? spring : {})}
          className={cn(
            "group flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors focus-visible:outline-none",
            it.active ? "text-primary-strong" : "text-muted-foreground",
            it.label === "Mais" && trashDrag && "animate-pulse text-destructive",
          )}
        >
          <span
            className={cn(
              "flex h-8 w-14 items-center justify-center rounded-full transition-colors group-focus-visible:ring-2 group-focus-visible:ring-ring",
              it.active && "bg-primary/12",
            )}
          >
            <it.icon className={cn("size-5 transition-transform", it.active && "scale-110")} aria-hidden="true" />
          </span>
          {it.label === "Mais" && trashDrag ? "Lixeira" : it.label}
        </button>
      ))}
    </nav>
  );
}
