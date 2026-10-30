import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Repeat, Square, SquareCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Area } from "@/lib/types";
import { monthGrid } from "@/lib/events";
import { DOW, addDays, parseD, today } from "@/lib/util";
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
  /** The day this entry is shown on (for repeating events, the occurrence). */
  date?: string;
  repeat?: boolean;
  /** Spaced-review reminders are shown but cannot be dragged. */
  fixed?: boolean;
}

export const DRAG_TYPE = "application/x-minha-rotina";

export function EntryChip({
  e,
  onOpen,
  compact,
  large,
}: {
  e: Entry;
  onOpen: (e: Entry) => void;
  compact?: boolean;
  /** Bigger, for touch (the phone's day list). */
  large?: boolean;
}) {
  return (
    <button
      type="button"
      draggable={!e.fixed}
      data-del={e.fixed ? undefined : `${e.kind}:${e.id}`}
      onDragStart={(ev) => {
        ev.dataTransfer.effectAllowed = "move";
        ev.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ kind: e.kind, id: e.id, from: e.date }));
      }}
      onClick={(ev) => {
        ev.stopPropagation();
        onOpen(e);
      }}
      title={(e.time ? e.time + " · " : "") + e.title}
      style={areaVar(e.area)}
      className={cn(
        "flex w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left text-[13px] transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        e.kind === "event" ? "area-soft font-medium text-foreground hover:brightness-95" : "text-muted-foreground hover:bg-muted",
        e.done && "line-through opacity-60",
        compact && "py-0",
        large && "min-h-11 gap-2.5 px-3 py-2 text-[15px]",
      )}
    >
      {/* Events: a colored bar (and their time). Tasks: a little checkbox, ticked when done. */}
      {e.kind === "event" ? (
        <span aria-hidden="true" className="h-3 w-1 shrink-0 rounded-full bg-(--area,var(--muted-foreground))" />
      ) : e.done ? (
        <SquareCheck aria-hidden="true" className="size-3.5 shrink-0 text-(--area,var(--muted-foreground))" />
      ) : (
        <Square aria-hidden="true" className="size-3.5 shrink-0 text-(--area,var(--muted-foreground))" />
      )}
      <span className="sr-only">{e.kind === "event" ? "Evento: " : "Tarefa: "}</span>
      {e.time && <span className="shrink-0 tabular-nums">{e.time}</span>}
      <span className="truncate">{e.title || "Sem título"}</span>
      {e.repeat && <Repeat className="size-3 shrink-0 opacity-70" aria-label="Repete" />}
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
  onMove: (e: { kind: Entry["kind"]; id: string; from?: string }, date: string) => void;
  max?: number;
}) {
  const days = monthGrid(anchor);
  const month = parseD(anchor).getMonth();
  const T = today();
  const [over, setOver] = useState<string | null>(null);
  // Phones: the grid shows colored dots, and the chosen day's entries are listed below it.
  const [picked, setPicked] = useState<string | null>(null);
  const inMonth = (d: string) => parseD(d).getMonth() === month;
  const day = picked && days.includes(picked) ? picked : days.includes(T) && inMonth(T) ? T : days.find(inMonth)!;
  const dayList = byDay[day] ?? [];
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
        <div className="grid grid-cols-7 border-b">
          {DOW.map((d) => (
            <div key={d} className="px-2 py-2.5 text-center text-sm font-semibold text-muted-foreground capitalize sm:text-right">
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
                onClick={() => setPicked(d)}
                className={cn(
                  "group relative flex min-h-16 min-w-0 flex-col gap-0.5 border-b border-r p-1 sm:min-h-28",
                  (i + 1) % 7 === 0 && "border-r-0",
                  d === day && "max-sm:bg-primary/8",
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
                      "flex size-7 items-center justify-center rounded-full text-sm tabular-nums transition-colors",
                      d === T
                        ? "bg-primary font-semibold text-primary-foreground"
                        : out
                          ? "text-muted-foreground"
                          : "text-muted-foreground",
                    )}
                  >
                    {parseD(d).getDate()}
                  </span>
                </div>
                {/* Phones: one dot per entry (up to 4), in the entry's area color. */}
                {list.length > 0 && (
                  <span
                    className="mt-auto flex flex-wrap justify-center gap-1 pb-1 sm:hidden"
                    aria-label={`${list.length} na agenda`}
                  >
                    {list.slice(0, 4).map((e) => (
                      <span
                        key={e.key}
                        style={areaVar(e.area)}
                        className={cn("size-1.5 rounded-full bg-(--area,var(--muted-foreground))", e.done && "opacity-40")}
                      />
                    ))}
                  </span>
                )}
                {list.slice(0, max).map((e) => (
                  <div key={e.key} className="max-sm:hidden">
                    <EntryChip e={e} onOpen={onOpen} compact />
                  </div>
                ))}
                {list.length > max && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className="mt-0.5 w-fit rounded-md bg-muted px-1.5 py-0.5 text-left text-[13px] font-semibold text-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none max-sm:hidden"
                        aria-label={`Ver todos os ${list.length} itens de ${parseD(d).toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}`}
                      >
                        +{list.length - max} mais
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="flex w-72 flex-col gap-1">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">
                          {parseD(d)
                            .toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
                            .replace(/^./, (c) => c.toUpperCase())}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">{list.length} itens</span>
                      </div>
                      {list.map((e) => (
                        <EntryChip key={e.key} e={e} onOpen={onOpen} />
                      ))}
                      {onAdd && (
                        <Button variant="ghost" size="sm" className="mt-1 justify-start" onClick={() => onAdd(d)}>
                          <Plus data-icon="inline-start" />
                          Adicionar neste dia
                        </Button>
                      )}
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {/* Phones: the chosen day, readable (the grid is too narrow for titles). Entries can be dragged up onto another day. */}
      <section className="flex flex-col gap-1.5 rounded-2xl border bg-card p-3 shadow-card sm:hidden" aria-live="polite">
        <div className="flex items-center justify-between gap-1 px-1">
          {/* Previous/next day: works by touch and by keyboard, not only by tapping the grid. */}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Dia anterior"
            disabled={day === days[0]}
            onClick={() => setPicked(addDays(day, -1))}
          >
            <ChevronLeft />
          </Button>
          <h3 className="mr-auto text-base font-semibold">
            {day === T
              ? "Hoje, " + parseD(day).toLocaleDateString("pt-BR", { day: "numeric", month: "long" })
              : parseD(day)
                  .toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
                  .replace(/^./, (c) => c.toUpperCase())}
          </h3>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Próximo dia"
            disabled={day === days[days.length - 1]}
            onClick={() => setPicked(addDays(day, 1))}
          >
            <ChevronRight />
          </Button>
          {onAdd && (
            <Button variant="ghost" size="sm" onClick={() => onAdd(day)}>
              <Plus data-icon="inline-start" />
              Adicionar
            </Button>
          )}
        </div>
        {dayList.length ? (
          dayList.map((e) => <EntryChip key={e.key} e={e} onOpen={onOpen} large />)
        ) : (
          <p className="px-1 py-2 text-sm text-muted-foreground">Nada marcado neste dia.</p>
        )}
      </section>
    </div>
  );
}
