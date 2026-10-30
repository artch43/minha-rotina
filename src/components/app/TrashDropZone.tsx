import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteByShortcut } from "@/lib/shortcuts";
import { deletePage, useStore } from "@/store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Dragged = { kind: string; id: string };
const KINDS = new Set(["task", "event", "todo", "note", "page"]);
const LABEL: Record<string, string> = {
  task: "a tarefa",
  event: "o evento",
  todo: "a tarefa",
  note: "a anotação",
  page: "a lista",
};

/** What a drag started on: data-trash (lists) or data-del (tasks, events, notes…), as "kind:id". */
function draggedFrom(target: EventTarget | null): Dragged | null {
  const el = (target as Element | null)?.closest?.("[data-trash], [data-del]");
  const v = el?.getAttribute("data-trash") || el?.getAttribute("data-del");
  const i = v?.indexOf(":") ?? -1;
  if (!v || i < 1) return null;
  const kind = v.slice(0, i);
  return KINDS.has(kind) ? { kind, id: v.slice(i + 1) } : null;
}

/**
 * A trash can that drops in at the top while something is being dragged (mouse or touch). Drop on it to delete,
 * with a little "gulp" and a burst; the usual toast offers Desfazer. Lists ask first, since their
 * tasks go too.
 */
export function TrashDropZone() {
  const [drag, setDrag] = useState<Dragged | null>(null);
  const [over, setOver] = useState(false);
  const [gulp, setGulp] = useState(0);
  const [burst, setBurst] = useState<{ x: number; y: number; k: number } | null>(null);
  const [askPage, setAskPage] = useState<string | null>(null);
  const hideTimer = useRef<number>(undefined);
  const pageTitle = useStore((s) => (askPage ? s.ws.pages.find((p) => p.id === askPage)?.title : undefined));
  const pageTasks = useStore((s) => (askPage ? Object.values(s.ws.items).filter((i) => i.db === askPage).length : 0));

  useEffect(() => {
    const start = (e: DragEvent) => {
      const d = draggedFrom(e.target);
      if (!d) return;
      clearTimeout(hideTimer.current);
      // Next frame: changing the page right inside dragstart can cancel the drag in some browsers.
      requestAnimationFrame(() => setDrag(d));
    };
    const end = () => {
      setOver(false);
      // A moment longer after a drop, so the "gulp" can be seen.
      hideTimer.current = window.setTimeout(() => setDrag(null), 650);
    };
    document.addEventListener("dragstart", start, true);
    document.addEventListener("dragend", end, true);
    return () => {
      document.removeEventListener("dragstart", start, true);
      document.removeEventListener("dragend", end, true);
    };
  }, []);

  const drop = (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (!drag) return;
    setGulp((g) => g + 1);
    setBurst({ x: e.clientX, y: e.clientY, k: Date.now() });
    navigator.vibrate?.(20);
    if (drag.kind === "page") setAskPage(drag.id);
    else deleteByShortcut(drag);
  };

  return (
    <>
      <div
        aria-hidden={!drag}
        className={cn(
          // At the top: the toasts (with Desfazer) and the phone's bottom bar live at the bottom.
          "pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center transition-[opacity,transform] duration-300 ease-out",
          drag ? "translate-y-0 opacity-100" : "-translate-y-8 opacity-0",
        )}
      >
        <div
          key={gulp}
          role="region"
          aria-label="Lixeira: solte aqui para excluir"
          onDragEnter={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (!over) setOver(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
          }}
          onDrop={drop}
          className={cn(
            "flex items-center gap-3 rounded-full border-2 border-dashed px-5 py-3 shadow-xl backdrop-blur transition-all duration-200",
            drag && "pointer-events-auto",
            gulp > 0 && "trash-gulp",
            over
              ? "scale-110 border-destructive bg-destructive text-white"
              : "border-border bg-popover/95 text-muted-foreground",
          )}
        >
          <span className={cn("trash-can relative flex", over && "trash-open")}>
            <Trash2 className="size-6" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold">{over ? `Soltar para excluir ${LABEL[drag?.kind ?? "task"]}` : "Arraste até aqui para excluir"}</span>
        </div>
      </div>

      {/* The burst where the item was dropped. */}
      {burst && (
        <div
          key={burst.k}
          aria-hidden="true"
          className="pointer-events-none fixed z-50"
          style={{ left: burst.x, top: burst.y }}
          onAnimationEnd={(e) => e.currentTarget === e.target && setBurst(null)}
        >
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className="trash-spark" style={{ "--a": `${i * 36}deg` } as React.CSSProperties} />
          ))}
          <span className="trash-ring" onAnimationEnd={() => setBurst(null)} />
        </div>
      )}

      <AlertDialog open={!!askPage} onOpenChange={(o) => !o && setAskPage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{pageTitle}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {pageTasks
                ? `A lista e as ${pageTasks} ${pageTasks === 1 ? "tarefa" : "tarefas"} dela serão excluídas.`
                : "A lista será excluída (ela não tem tarefas)."}{" "}
              Você pode desfazer logo em seguida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => askPage && deletePage(askPage)}>
              Excluir lista
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
