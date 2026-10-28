import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Area } from "@/lib/types";
import { monthGrid } from "@/lib/events";
import { DOW, parseD, today } from "@/lib/util";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { areaVar } from "../common";

export interface Entry {
  key: string;
  id: string;
  kind: "event" | "task" | "todo";
  title: string;
  time?: string;
  area?: Area;
  done?: boolean;
  /** Spaced-review reminders are shown but cannot be dragged. */
  fixed?: boolean;
}

export const DRAG_TYPE = "application/x-minha-rotina";

export function EntryChip({ e, onOpen, compact }: { e: Entry; onOpen: (e: Entry) => void; compact?: boolean }) {
  return (
    <button
      type="button"
      draggable={!e.fixed}
      onDragStart={(ev) => {
        ev.dataTransfer.effectAllowed = "move";
        ev.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ kind: e.kind, id: e.id }));
      }}
      onClick={(ev) => {
        ev.stopPropagation();
        onOpen(e);
      }}
      title={(e.time ? e.time + " · " : "") + e.title}
      style={areaVar(e.area)}
      className={cn(
        "flex w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left text-xs transition-colors",
        e.kind === "event" ? "area-soft font-medium text-foreground hover:brightness-95" : "text-muted-foreground hover:bg-muted",
        e.done && "line-through opacity-60",
        compact && "py-0",
      )}
    >
      <span
        aria-hidden="true"
        className={cn("shrink-0 rounded-full bg-(--area,var(--muted-foreground))", e.kind === "event" ? "h-3 w-1" : "size-1.5")}
      />
      {e.time && <span className="shrink-0 tabular-nums">{e.time}</span>}
      <span className="truncate">{e.title || "Sem título"}</span>
    </button>
  );
}

/** Month grid (Sunday first). Every entry can be dragged to another day. */
export function MonthView({
  anchor,
  byDay,
  onOpen,
  onAdd,
  onMove,
  max = 3,
}: {
  anchor: string;
  byDay: Record<string, Entry[]>;
  onOpen: (e: Entry) => void;
  onAdd?: (date: string) => void;
  onMove: (e: { kind: Entry["kind"]; id: string }, date: string) => void;
  max?: number;
}) {
  const days = monthGrid(anchor);
  const month = parseD(anchor).getMonth();
  const T = today();
  const [over, setOver] = useState<string | null>(null);
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="grid grid-cols-7 border-b">
        {DOW.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground capitalize sm:text-right">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const list = byDay[d] ?? [];
          const out = parseD(d).getMonth() !== month;
          return (
            <div
              key={d}
              className={cn(
                "group relative flex min-h-20 min-w-0 flex-col gap-0.5 border-b border-r p-1 sm:min-h-28",
                (i + 1) % 7 === 0 && "border-r-0",
                out && "bg-muted/40",
                over === d && "bg-primary/8 ring-2 ring-inset ring-primary/40",
              )}
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes(DRAG_TYPE)) {
                  e.preventDefault();
                  if (over !== d) setOver(d);
                }
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver((o) => (o === d ? null : o));
              }}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                try {
                  onMove(JSON.parse(e.dataTransfer.getData(DRAG_TYPE)), d);
                } catch {
                  /* not ours */
                }
              }}
            >
              <div className="flex items-center justify-between">
                {onAdd ? (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Adicionar em ${d}`}
                    className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                    onClick={() => onAdd(d)}
                  >
                    <Plus />
                  </Button>
                ) : (
                  <span />
                )}
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                    d === T
                      ? "bg-primary font-semibold text-primary-foreground"
                      : out
                        ? "text-muted-foreground/60"
                        : "text-muted-foreground",
                  )}
                >
                  {parseD(d).getDate()}
                </span>
              </div>
              {list.slice(0, max).map((e) => (
                <EntryChip key={e.key} e={e} onOpen={onOpen} compact />
              ))}
              {list.length > max && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="px-1.5 text-left text-xs font-medium text-muted-foreground hover:text-foreground">
                      +{list.length - max} mais
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="flex w-64 flex-col gap-1">
                    <span className="mb-1 text-sm font-semibold capitalize">
                      {parseD(d).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                    </span>
                    {list.map((e) => (
                      <EntryChip key={e.key} e={e} onOpen={onOpen} />
                    ))}
                  </PopoverContent>
                </Popover>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
