import { useRef, useState } from "react";
import {
  ArrowLeftRight,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Palette,
  Pencil,
  Plus,
  RotateCcw,
  Tag,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database, Group, Item, Page, View } from "@/lib/types";
import { groupOf, optOf, statusProp } from "@/lib/model";
import { GROUPS, fmtDate, today } from "@/lib/util";
import {
  addStatus,
  deleteStatus,
  moveStatus,
  newItem,
  celebrate,
  isJustCreated,
  openPeek,
  patchItem,
  renameStatus,
  setProp,
  setStatusColor,
  setStatusGroup,
  useStore,
} from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OptionBadge, TagSwatches, areaVar, useAreas } from "../common";
import { TASK_MIME, setDraggedTask } from "@/lib/dnd";

/**
 * Kanban board. Columns are the status options and can be renamed by clicking their name.
 * While a card is dragged it stays where it is (moving it in the DOM would cancel the drag in
 * most browsers); only a drop line shows where it will land.
 */
export function Board({ page, db, view, list }: { page: Page; db: Database; view: View; list: Item[] }) {
  const sp = statusProp(db)!;
  const areas = useAreas();
  const [drag, setDrag] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ col: string; index: number } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  const finishDrop = (colId: string) => {
    if (!drag || !drop) return;
    const items = useStore.getState().ws.items;
    const ids = list.filter((i) => i.props[sp.id] === colId && i.id !== drag).map((i) => i.id);
    const prev = items[ids[drop.index - 1]],
      next = items[ids[drop.index]];
    const order = prev && next ? (prev.order + next.order) / 2 : prev ? prev.order + 1 : next ? next.order - 1 : Date.now();
    if (view.sort?.prop)
      useStore.getState().mut((w) => {
        w.dbs[page.id].views.find((v) => v.id === view.id)!.sort = null;
      });
    patchItem(drag, (it) => {
      it.order = order;
    });
    if (items[drag]?.props[sp.id] !== colId) setProp(drag, sp.id, colId);
  };

  return (
    <div className="-mx-4 flex items-start gap-3 overflow-x-auto px-4 pb-6 md:-mx-8 md:px-8">
      {sp.options!.map((o, ci) => {
        const items = list.filter((i) => i.props[sp.id] === o.id);
        return (
          <section
            key={o.id}
            aria-label={o.name}
            className={cn(
              "flex w-72 shrink-0 flex-col gap-2 rounded-2xl border border-border/60 bg-column p-2 transition-colors",
              drop?.col === o.id && "bg-primary/8 ring-2 ring-primary/30",
            )}
            onDragOver={(e) => {
              if (!drag) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              const cards = [...e.currentTarget.querySelectorAll<HTMLElement>("[data-card]:not([data-dragging])")];
              let index = cards.findIndex((el) => e.clientY < el.getBoundingClientRect().top + el.offsetHeight / 2);
              if (index < 0) index = cards.length;
              if (drop?.col !== o.id || drop.index !== index) setDrop({ col: o.id, index });
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrop((d) => (d?.col === o.id ? null : d));
            }}
            onDrop={(e) => {
              e.preventDefault();
              finishDrop(o.id);
              setDrag(null);
              setDrop(null);
            }}
          >
            <header className="flex items-center gap-1.5 px-1 pt-0.5">
              <span aria-hidden="true" data-color={o.color} className="swatch-color size-2.5 shrink-0 rounded-full" />
              {editing === o.id ? (
                <ColumnName
                  name={o.name}
                  onDone={(name) => {
                    if (name !== null) renameStatus(page.id, o.id, name);
                    setEditing(null);
                  }}
                />
              ) : (
                <button
                  className="min-w-0 truncate rounded-md px-1 py-0.5 text-left text-[15px] font-semibold hover:bg-background"
                  title="Clique para renomear"
                  onClick={() => setEditing(o.id)}
                >
                  {o.name}
                </button>
              )}
              <span className="text-xs tabular-nums text-muted-foreground">{items.length}</span>
              <ColumnMenu
                dbId={page.id}
                optId={o.id}
                first={ci === 0}
                last={ci === sp.options!.length - 1}
                only={sp.options!.length <= 1}
                color={o.color}
                group={o.group ?? "todo"}
                onRename={() => setEditing(o.id)}
              />
            </header>
            <div className="flex min-h-10 flex-col gap-2">
              {(() => {
                const nodes: React.ReactNode[] = [];
                let visible = 0;
                for (const it of items) {
                  if (drop?.col === o.id && it.id !== drag && visible === drop.index) nodes.push(<DropLine key="drop" />);
                  if (it.id !== drag) visible++;
                  nodes.push(
                    <Card
                      key={it.id}
                      it={it}
                      db={db}
                      area={areas.find((a) => a.id === it.area)}
                      dragging={drag === it.id}
                      onDragStart={() => setDrag(it.id)}
                      onDragEnd={() => {
                        setDrag(null);
                        setDrop(null);
                      }}
                    />,
                  );
                }
                if (drop?.col === o.id && visible === drop.index) nodes.push(<DropLine key="drop" />);
                return nodes;
              })()}
            </div>
            <QuickAdd
              onAdd={(title) => {
                newItem(page.id, { [sp.id]: o.id }, title);
                celebrate("Tarefa adicionada", `“${title}” em ${o.name}`, "✅");
              }}
            />
          </section>
        );
      })}
      <Button
        variant="ghost"
        className="mt-1 shrink-0 text-muted-foreground"
        onClick={() => {
          const id = addStatus(page.id);
          setEditing(id);
        }}
      >
        <Plus data-icon="inline-start" />
        Nova coluna
      </Button>
    </div>
  );
}

const DropLine = () => <div aria-hidden="true" className="-my-1 h-0.5 rounded-full bg-primary" />;

function ColumnName({ name, onDone }: { name: string; onDone: (name: string | null) => void }) {
  const [v, setV] = useState(name);
  return (
    <Input
      autoFocus
      aria-label="Nome da coluna"
      className="h-7 flex-1 px-1.5 text-sm font-semibold"
      value={v}
      onFocus={(e) => e.target.select()}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => onDone(v)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onDone(v);
        if (e.key === "Escape") onDone(null);
      }}
    />
  );
}

function ColumnMenu({
  dbId,
  optId,
  first,
  last,
  only,
  color,
  group,
  onRename,
}: {
  dbId: string;
  optId: string;
  first: boolean;
  last: boolean;
  only: boolean;
  color: import("@/lib/types").Color;
  group: Group;
  onRename: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="ml-auto" aria-label="Opções da coluna">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={onRename}>
            <Pencil />
            Renomear
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Palette />
              Cor
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="p-3">
              <TagSwatches value={color} onChange={(c) => setStatusColor(dbId, optId, c)} />
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Tag />
              Conta como
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuLabel className="max-w-56 text-xs font-normal text-muted-foreground">
                Usado pelo Início e pela revisão espaçada.
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup value={group} onValueChange={(g) => setStatusGroup(dbId, optId, g as Group)}>
                {(Object.entries(GROUPS) as [Group, string][]).map(([g, n]) => (
                  <DropdownMenuRadioItem key={g} value={g}>
                    {n}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem disabled={first} onSelect={() => moveStatus(dbId, optId, -1)}>
            <ChevronLeft />
            Mover para a esquerda
          </DropdownMenuItem>
          <DropdownMenuItem disabled={last} onSelect={() => moveStatus(dbId, optId, 1)}>
            <ChevronRight />
            Mover para a direita
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" disabled={only} onSelect={() => deleteStatus(dbId, optId)}>
            <Trash2 />
            Excluir coluna
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Card({
  it,
  db,
  area,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  it: Item;
  db: Database;
  area?: import("@/lib/types").Area;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const sp = statusProp(db)!;
  const ref = useRef<HTMLDivElement>(null);
  const date = typeof it.props.date === "string" ? it.props.date : "";
  const late = date && date.slice(0, 10) < today() && groupOf(db, it) !== "done";
  const prio = optOf(
    db.props.find((p) => p.id === "prio"),
    it.props.prio,
  );
  const tags = ((it.props.tags as string[]) ?? [])
    .map((id) =>
      optOf(
        db.props.find((p) => p.id === "tags"),
        id,
      ),
    )
    .filter(Boolean);
  const review = db.srs && it.review?.next && groupOf(db, it) === "done";
  // A card that just appeared pops in, so it's easy to see where the new task went.
  const [isNew] = useState(() => isJustCreated(it.id));
  return (
    <div
      ref={ref}
      data-card
      data-del={"task:" + it.id}
      data-dragging={dragging || undefined}
      draggable
      role="button"
      tabIndex={0}
      style={areaVar(area)}
      aria-label={it.title || "Sem título"}
      className={cn(
        "area-stripe lift group flex cursor-pointer select-none flex-col gap-2 rounded-xl border border-border/70 bg-card py-3 pr-3 pl-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        dragging && "opacity-40",
        isNew && "card-new",
      )}
      onClick={() => openPeek(it.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter") openPeek(it.id);
      }}
      onDragStart={(e) => {
        // "copy" too: dropping on another list in the sidebar makes a copy there.
        e.dataTransfer.effectAllowed = "copyMove";
        e.dataTransfer.setData("text/plain", it.id);
        e.dataTransfer.setData(TASK_MIME, it.id);
        setDraggedTask(it.id);
        // Defer the state change so the browser has already taken its drag snapshot.
        requestAnimationFrame(onDragStart);
      }}
      onDragEnd={() => {
        setDraggedTask(null);
        onDragEnd();
      }}
    >
      <div className="flex items-start gap-2">
        <span className="min-w-0 flex-1 text-[15px] font-medium break-words">
          {it.title || <span className="text-muted-foreground">Sem título</span>}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Mudar status"
              className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <ArrowLeftRight />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuLabel>Mover para</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={String(it.props[sp.id] ?? "")} onValueChange={(v) => setProp(it.id, sp.id, v)}>
              {sp.options!.map((o) => (
                <DropdownMenuRadioItem key={o.id} value={o.id}>
                  {o.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {(date || prio || tags.length > 0 || review) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {date && (
            <span
              className={cn(
                "flex items-center gap-1 text-[13px] tabular-nums",
                late ? "font-medium text-destructive" : "text-muted-foreground",
              )}
            >
              <CalendarClock className="size-3.5" />
              {fmtDate(date)}
            </span>
          )}
          {prio && <OptionBadge opt={prio} />}
          {tags.map((t) => (
            <OptionBadge key={t!.id} opt={t!} />
          ))}
          {review && (
            <span className="flex items-center gap-1 text-[13px] text-primary">
              <RotateCcw className="size-3" />
              revisar {fmtDate(it.review!.next!).toLowerCase()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function QuickAdd({ onAdd }: { onAdd: (title: string) => void }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState("");
  if (!open)
    return (
      <Button variant="ghost" size="sm" className="justify-start text-muted-foreground" onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" />
        Nova tarefa
      </Button>
    );
  const submit = () => {
    if (v.trim()) onAdd(v.trim());
    setV("");
  };
  return (
    <Input
      autoFocus
      autoComplete="off"
      placeholder="Nome da tarefa e Enter…"
      aria-label="Nome da nova tarefa"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        submit();
        setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") submit();
        if (e.key === "Escape") {
          setV("");
          setOpen(false);
        }
      }}
    />
  );
}
