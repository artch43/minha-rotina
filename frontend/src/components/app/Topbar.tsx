import { useCallback, useEffect, useRef, useState } from "react";
import { CloudOff, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { cloudEnabled } from "@/lib/supabase";
import { useSync } from "@/lib/sync";
import { useStore } from "@/store";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AreaDot, NewAreaButton, areaVar, useAreas } from "../common";

export function AreaSwitcher({ className }: { className?: string }) {
  const areas = useAreas();
  const area = useStore((s) => s.ui.area);
  const setUi = useStore((s) => s.setUi);
  const select = (id: string) =>
    setUi((u) => {
      u.area = id;
    });
  // When the chips don't fit, they scroll sideways (no scrollbar line) and the edges fade out
  // on the side where there is more, so it's clear there is more to swipe to.
  const box = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const measure = useCallback(() => {
    const el = box.current;
    if (!el) return;
    const left = el.scrollLeft > 2,
      right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setEdges((e) => (e.left === left && e.right === right ? e : { left, right }));
  }, []);
  useEffect(() => {
    measure();
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, areas.length]);
  // The chosen chip is brought into view (e.g. "Estudos" chosen from elsewhere).
  useEffect(() => {
    box.current?.querySelector<HTMLElement>("[data-state=on]")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [area]);
  return (
    <div className={cn("flex max-w-full items-center gap-1.5", className)}>
      <div
        ref={box}
        onScroll={measure}
        data-fade-left={edges.left || undefined}
        data-fade-right={edges.right || undefined}
        className="edge-fade no-scrollbar -my-1 min-w-0 snap-x snap-proximity overflow-x-auto scroll-px-2 px-0.5 py-1"
      >
        <ToggleGroup
          type="single"
          variant="outline"
          aria-label="Mostrar a área"
          className="w-max [&>*]:snap-start"
          value={area}
          onValueChange={(v) => v && select(v)}
        >
          <ToggleGroupItem value="all" className="px-3">
            Todas
          </ToggleGroupItem>
          {areas.map((a) => (
            <ToggleGroupItem
              key={a.id}
              value={a.id}
              style={areaVar(a)}
              className="gap-1.5 px-3 data-[state=on]:border-(--area) data-[state=on]:bg-(--area)/12 data-[state=on]:text-foreground"
            >
              <AreaDot area={a} />
              {a.name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <NewAreaButton onCreated={select} className="shrink-0" />
    </div>
  );
}

function SaveState() {
  const status = useSync((s) => s.status);
  if (!cloudEnabled) return <span className="hidden text-sm text-muted-foreground lg:inline">Salvo neste navegador</span>;
  if (status === "saving")
    return (
      <span className="flex items-center gap-1 text-sm text-muted-foreground" role="status">
        <Loader2 className="size-3.5 animate-spin" />
        Salvando…
      </span>
    );
  if (status === "offline" || status === "error")
    return (
      <span className="flex items-center gap-1 text-sm text-warning" role="status">
        <CloudOff className="size-3.5" />
        {status === "offline" ? "Sem conexão" : "Tentando salvar"}
      </span>
    );
  if (status === "saved")
    return (
      <span className="hidden items-center gap-1 text-sm text-muted-foreground sm:flex" role="status">
        <Check className="size-3.5" />
        Salvo
      </span>
    );
  return null;
}

export function Topbar({ title, showAreas = true }: { title: React.ReactNode; showAreas?: boolean }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-10 flex min-h-16 items-center gap-3 border-b bg-background/90 px-4 py-2 backdrop-blur supports-backdrop-filter:bg-background/75",
        // On phones the bottom bar has the menu; with nothing else to show, the top bar steps aside.
        !title && !showAreas && "max-md:hidden",
      )}
    >
      <SidebarTrigger className="-ml-1 size-10 max-md:hidden [&_svg]:size-5" />
      {title && (
        <>
          <Separator orientation="vertical" className="h-5 max-md:hidden" />
          <div className="min-w-0 flex-1 truncate text-base font-semibold">{title}</div>
        </>
      )}
      {showAreas && <AreaSwitcher className={cn("min-w-0", !title && "flex-1")} />}
      {/* Always at the right edge, also on pages without a title or areas. */}
      <div className="ml-auto shrink-0">
        <SaveState />
      </div>
    </header>
  );
}
