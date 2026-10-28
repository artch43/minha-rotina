import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Workspace } from "@/lib/types";
import { eventsByDay, inArea, minutesOf, monthGrid, weekOf } from "@/lib/events";
import { dateOf, groupOf } from "@/lib/model";
import { MONTHS, addDays, pad, parseD, today } from "@/lib/util";
import { go, moveEvent, openEvent, openPeek, patchItem, updateTodo, useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DRAG_TYPE, EntryChip, MonthView, type Entry } from "./MonthView";
import { areaVar } from "../common";

/** Events, plus (optionally) dated tasks and to-dos, for each day between `from` and `to`. */
function collect(ws: Workspace, from: string, to: string, area: string, showTasks: boolean) {
  const areaOf = (id?: string) => ws.settings.areas.find((a) => a.id === id);
  const byDay: Record<string, Entry[]> = {};
  const ev = eventsByDay(ws, from, to, area);
  for (const d in ev)
    byDay[d] = ev[d].map((e) => ({
      key: "e" + e.id,
      id: e.id,
      kind: "event",
      title: e.title,
      time: e.allDay ? undefined : e.start,
      area: areaOf(e.area),
    }));
  if (showTasks) {
    for (const it of Object.values(ws.items)) {
      const db = ws.dbs[it.db];
      const d = db ? dateOf(db, it) : "";
      if (!d || d.slice(0, 10) < from || d.slice(0, 10) > to || !inArea(it.area, area)) continue;
      (byDay[d.slice(0, 10)] ??= []).push({
        key: "t" + it.id,
        id: it.id,
        kind: "task",
        title: it.title,
        time: d.slice(11, 16) || undefined,
        area: areaOf(it.area),
        done: groupOf(db, it) === "done",
      });
    }
    for (const t of Object.values(ws.todos)) {
      if (!t.date || t.date < from || t.date > to || !inArea(t.area, area)) continue;
      (byDay[t.date] ??= []).push({ key: "d" + t.id, id: t.id, kind: "todo", title: t.text, area: areaOf(t.area), done: t.done });
    }
  }
  for (const d in byDay)
    byDay[d].sort(
      (a, b) => Number(b.kind === "event") - Number(a.kind === "event") || (a.time ?? "").localeCompare(b.time ?? ""),
    );
  return byDay;
}

function openEntry(e: Entry) {
  if (e.kind === "event") openEvent(e.id);
  else if (e.kind === "task") openPeek(e.id);
  else go("todo");
}

/** Moves anything dropped on a day to that day (and, for events in the week view, to that time). */
function moveEntry(e: { kind: Entry["kind"]; id: string }, date: string, minutes?: number) {
  if (e.kind === "event") {
    moveEvent(e.id, date);
    if (minutes !== undefined)
      useStore.getState().mut((w) => {
        const ev = w.events[e.id];
        if (!ev || ev.allDay) return;
        const length = Math.max(15, minutesOf(ev.end || ev.start) - minutesOf(ev.start));
        const hhmm = (m: number) => pad(Math.floor(m / 60) % 24) + ":" + pad(m % 60);
        ev.start = hhmm(minutes);
        ev.end = hhmm(Math.min(minutes + length, 23 * 60 + 59));
      });
  } else if (e.kind === "task")
    patchItem(e.id, (it) => {
      const cur = typeof it.props.date === "string" ? it.props.date : "";
      it.props.date = date + cur.slice(10);
    });
  else updateTodo(e.id, { date });
}

export function CalendarPage() {
  const ws = useStore((s) => s.ws);
  const area = useStore((s) => s.ui.area);
  const cal = useStore((s) => s.ui.calendar);
  const setUi = useStore((s) => s.setUi);
  const set = (p: Partial<typeof cal>) =>
    setUi((u) => {
      Object.assign(u.calendar, p);
    });
  const anchor = cal.anchor;
  const d = parseD(anchor);
  const days = cal.view === "month" ? monthGrid(anchor) : weekOf(anchor);
  const byDay = collect(ws, days[0], days[days.length - 1], area, cal.showTasks);
  const shift = (k: number) => {
    if (cal.view === "week") return set({ anchor: addDays(anchor, 7 * k) });
    const n = new Date(d.getFullYear(), d.getMonth() + k, 1);
    set({ anchor: `${n.getFullYear()}-${pad(n.getMonth() + 1)}-01` });
  };
  const week = weekOf(anchor);
  const label =
    cal.view === "month"
      ? `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
      : `${parseD(week[0]).getDate()} ${MONTHS[parseD(week[0]).getMonth()].slice(0, 3)} – ${parseD(week[6]).getDate()} ${MONTHS[parseD(week[6]).getMonth()].slice(0, 3)} ${parseD(week[6]).getFullYear()}`;

  return (
    <div className="flex flex-col gap-4 px-4 py-6 md:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold tracking-tight capitalize md:text-3xl">{label}</h1>
        <Button
          onClick={() => openEvent(null, cal.view === "month" && anchor.slice(0, 7) !== today().slice(0, 7) ? anchor : today())}
        >
          <Plus data-icon="inline-start" />
          Novo evento
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Anterior" onClick={() => shift(-1)}>
          <ChevronLeft />
        </Button>
        <Button variant="outline" onClick={() => set({ anchor: today() })}>
          Hoje
        </Button>
        <Button variant="outline" size="icon" aria-label="Próximo" onClick={() => shift(1)}>
          <ChevronRight />
        </Button>
        <ToggleGroup
          type="single"
          variant="outline"
          value={cal.view}
          onValueChange={(v) => v && set({ view: v as "month" | "week" })}
          aria-label="Visão"
        >
          <ToggleGroupItem value="month" className="px-3">
            Mês
          </ToggleGroupItem>
          <ToggleGroupItem value="week" className="px-3">
            Semana
          </ToggleGroupItem>
        </ToggleGroup>
        <div className="ml-auto flex items-center gap-2">
          <Switch id="show-tasks" checked={cal.showTasks} onCheckedChange={(v) => set({ showTasks: v })} />
          <Label htmlFor="show-tasks">Mostrar tarefas</Label>
        </div>
      </div>
      {cal.view === "month" ? (
        <MonthView
          anchor={anchor}
          byDay={byDay}
          onOpen={openEntry}
          onAdd={(date) => openEvent(null, date)}
          onMove={(e, date) => moveEntry(e, date)}
        />
      ) : (
        <WeekView days={week} byDay={byDay} />
      )}
      <p className="text-xs text-muted-foreground">
        Arraste um evento ou tarefa para outro dia para remarcar. Os eventos aparecem com fundo colorido; tarefas e afazeres, só
        com o ponto da área.
      </p>
    </div>
  );
}

const START_H = 6,
  END_H = 24,
  HOUR = 48;

function WeekView({ days, byDay }: { days: string[]; byDay: Record<string, Entry[]> }) {
  const ws = useStore((s) => s.ws);
  const T = today();
  const [over, setOver] = useState<string | null>(null);
  const hours = Array.from({ length: END_H - START_H }, (_, i) => START_H + i);
  const timed = (day: string) =>
    Object.values(ws.events).filter(
      (e) => e.date === day && !e.allDay && (byDay[day] ?? []).some((x) => x.kind === "event" && x.id === e.id),
    );
  const untimed = (day: string) => (byDay[day] ?? []).filter((x) => x.kind !== "event" || !x.time);
  const minutesAt = (e: React.DragEvent | React.MouseEvent, el: HTMLElement) => {
    const y = e.clientY - el.getBoundingClientRect().top;
    return Math.max(START_H * 60, Math.min((END_H - 1) * 60 + 45, START_H * 60 + Math.round(((y / HOUR) * 60) / 15) * 15));
  };
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <div className="min-w-[720px]">
        <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b">
          <div />
          {days.map((d) => (
            <div key={d} className="flex flex-col items-center gap-0.5 border-l py-2">
              <span className="text-xs text-muted-foreground capitalize">
                {parseD(d).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
              </span>
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                  d === T && "bg-primary text-primary-foreground",
                )}
              >
                {parseD(d).getDate()}
              </span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b">
          <div className="px-1 py-1.5 text-right text-[11px] text-muted-foreground">dia todo</div>
          {days.map((d) => (
            <div
              key={d}
              className={cn("flex min-h-9 min-w-0 flex-col gap-0.5 border-l p-1", over === d + "-all" && "bg-primary/8")}
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes(DRAG_TYPE)) {
                  e.preventDefault();
                  setOver(d + "-all");
                }
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                try {
                  moveEntry(JSON.parse(e.dataTransfer.getData(DRAG_TYPE)), d);
                } catch {
                  /* ignore */
                }
              }}
            >
              {untimed(d).map((x) => (
                <EntryChip key={x.key} e={x} onOpen={openEntry} compact />
              ))}
            </div>
          ))}
        </div>
        <div className="grid max-h-[65vh] grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] overflow-y-auto">
          <div>
            {hours.map((h) => (
              <div
                key={h}
                style={{ height: HOUR }}
                className="pr-2 text-right text-[11px] text-muted-foreground tabular-nums -translate-y-2"
              >
                {h > START_H ? `${pad(h)}:00` : ""}
              </div>
            ))}
          </div>
          {days.map((d) => (
            <div
              key={d}
              className={cn("relative border-l", over === d && "bg-primary/5")}
              style={{ height: hours.length * HOUR }}
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes(DRAG_TYPE)) {
                  e.preventDefault();
                  setOver(d);
                }
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                try {
                  moveEntry(JSON.parse(e.dataTransfer.getData(DRAG_TYPE)), d, minutesAt(e, e.currentTarget));
                } catch {
                  /* ignore */
                }
              }}
              onDoubleClick={(e) => {
                const m = minutesAt(e, e.currentTarget);
                openEvent(null, d, pad(Math.floor(m / 60)) + ":" + pad(m % 60));
              }}
            >
              {hours.map((h) => (
                <div
                  key={h}
                  style={{ top: (h - START_H) * HOUR }}
                  className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border/70 first:border-0"
                />
              ))}
              {timed(d).map((ev) => {
                const s = Math.max(minutesOf(ev.start), START_H * 60),
                  e = Math.max(minutesOf(ev.end || ev.start), s + 30);
                const a = ws.settings.areas.find((x) => x.id === ev.area);
                return (
                  <button
                    key={ev.id}
                    draggable
                    style={{
                      ...areaVar(a),
                      top: ((s - START_H * 60) / 60) * HOUR,
                      height: Math.max(22, ((e - s) / 60) * HOUR - 2),
                    }}
                    onDragStart={(x) => {
                      x.dataTransfer.effectAllowed = "move";
                      x.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ kind: "event", id: ev.id }));
                    }}
                    onClick={() => openEvent(ev.id)}
                    className="area-soft area-stripe absolute inset-x-1 flex flex-col overflow-hidden rounded-md py-1 pr-1.5 pl-3 text-left text-xs hover:brightness-95"
                  >
                    <span className="truncate font-semibold">{ev.title || "Sem título"}</span>
                    <span className="truncate tabular-nums text-muted-foreground">
                      {ev.start}
                      {ev.end ? `–${ev.end}` : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
