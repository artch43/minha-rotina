import type { CalendarEvent, Workspace } from "./types";
import { addDays, parseD, ymd } from "./util";

/** All-day events are announced relative to 9:00 on their day. */
export const ALL_DAY_ALERT_TIME = "09:00";

export const ALERT_PRESETS: { minutes: number; label: string }[] = [
  { minutes: 0, label: "Na hora" },
  { minutes: 10, label: "10 min antes" },
  { minutes: 30, label: "30 min antes" },
  { minutes: 60, label: "1 hora antes" },
  { minutes: 1440, label: "1 dia antes" },
  { minutes: 10080, label: "1 semana antes" },
];

export function alertLabel(minutes: number) {
  const preset = ALERT_PRESETS.find((p) => p.minutes === minutes);
  if (preset) return preset.label;
  if (minutes % 1440 === 0) return `${minutes / 1440} dias antes`;
  if (minutes % 60 === 0) return `${minutes / 60} horas antes`;
  return `${minutes} min antes`;
}

/** The moment the event starts, in this browser's time zone. */
export function startOf(ev: Pick<CalendarEvent, "date" | "allDay" | "start">): Date {
  const [h, m] = (ev.allDay ? ALL_DAY_ALERT_TIME : ev.start || "00:00").split(":").map(Number);
  const d = parseD(ev.date);
  d.setHours(h, m, 0, 0);
  return d;
}

export function whenLabel(ev: Pick<CalendarEvent, "date" | "allDay" | "start">) {
  const d = startOf(ev);
  const day = d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  return ev.allDay ? `${day} (dia inteiro)` : `${day} às ${ev.start}`;
}

export interface ReminderRow {
  event_id: string;
  send_at: string;
  title: string;
  when_label: string;
}

/** E-mail reminders still to be sent for an event (past ones are skipped). */
export function remindersFor(ev: CalendarEvent, now = new Date()): ReminderRow[] {
  const start = startOf(ev).getTime();
  const seen = new Set<number>();
  const out: ReminderRow[] = [];
  for (const m of ev.alerts) {
    if (seen.has(m) || m < 0) continue;
    seen.add(m);
    const at = start - m * 60_000;
    if (at < now.getTime() - 60_000) continue;
    out.push({ event_id: ev.id, send_at: new Date(at).toISOString(), title: ev.title || "Evento", when_label: whenLabel(ev) });
  }
  return out.sort((a, b) => a.send_at.localeCompare(b.send_at));
}

export const inArea = (area: string | undefined, filter: string) => filter === "all" || area === filter;

export function eventsByDay(ws: Workspace, from: string, to: string, areaFilter = "all") {
  const out: Record<string, CalendarEvent[]> = {};
  for (const ev of Object.values(ws.events)) {
    if (ev.date < from || ev.date > to || !inArea(ev.area, areaFilter)) continue;
    (out[ev.date] ??= []).push(ev);
  }
  for (const k in out) out[k].sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start.localeCompare(b.start));
  return out;
}

/** The 7 days (Sunday first) of the week that contains `day`. */
export function weekOf(day: string) {
  const start = addDays(day, -parseD(day).getDay());
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** The 5 or 6 weeks shown in a month grid for the month of `day`. */
export function monthGrid(day: string) {
  const d = parseD(day);
  const first = ymd(new Date(d.getFullYear(), d.getMonth(), 1));
  const start = addDays(first, -parseD(first).getDay());
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  return parseD(days[35]).getMonth() !== d.getMonth() ? days.slice(0, 35) : days;
}

export const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};
