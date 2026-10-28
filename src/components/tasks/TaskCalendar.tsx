import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Database, Item } from "@/lib/types";
import { groupOf } from "@/lib/model";
import { MONTHS, parseD, pad, today, ymd } from "@/lib/util";
import { openPeek, patchItem, useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { MonthView, type Entry } from "../calendar/MonthView";
import { useAreas } from "../common";

/** A list's tasks laid out by their date. Drag a task to another day to reschedule it. */
export function TaskCalendar({
  dbId,
  db,
  list,
  onCreate,
}: {
  dbId: string;
  db: Database;
  list: Item[];
  onCreate: (date: string) => void;
}) {
  const month = useStore((s) => s.ui.calMonth[dbId]) ?? today().slice(0, 7);
  const setUi = useStore((s) => s.setUi);
  const areas = useAreas();
  const anchor = month + "-01";
  const byDay: Record<string, Entry[]> = {};
  for (const it of list) {
    const d = typeof it.props.date === "string" ? it.props.date : "";
    const area = areas.find((a) => a.id === it.area);
    if (d)
      (byDay[d.slice(0, 10)] ??= []).push({
        key: it.id,
        id: it.id,
        kind: "task",
        title: it.title,
        time: d.slice(11, 16) || undefined,
        area,
        done: groupOf(db, it) === "done",
      });
    if (db.srs && it.review?.next && groupOf(db, it) === "done")
      (byDay[it.review.next] ??= []).push({
        key: it.id + "-r",
        id: it.id,
        kind: "task",
        title: "Revisar: " + it.title,
        area,
        fixed: true,
      });
  }
  const shift = (k: number) => {
    const d = parseD(anchor);
    const n = new Date(d.getFullYear(), d.getMonth() + k, 1);
    setUi((u) => {
      u.calMonth[dbId] = n.getFullYear() + "-" + pad(n.getMonth() + 1);
    });
  };
  const d = parseD(anchor);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="mr-auto text-lg font-semibold capitalize">
          {MONTHS[d.getMonth()]} {d.getFullYear()}
        </h2>
        <Button variant="outline" size="icon" aria-label="Mês anterior" onClick={() => shift(-1)}>
          <ChevronLeft />
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            setUi((u) => {
              u.calMonth[dbId] = ymd(new Date()).slice(0, 7);
            })
          }
        >
          Hoje
        </Button>
        <Button variant="outline" size="icon" aria-label="Próximo mês" onClick={() => shift(1)}>
          <ChevronRight />
        </Button>
      </div>
      <MonthView
        anchor={anchor}
        byDay={byDay}
        onOpen={(e) => openPeek(e.id)}
        onAdd={onCreate}
        onMove={(e, date) => {
          if (e.kind !== "task") return;
          patchItem(e.id, (it) => {
            const cur = typeof it.props.date === "string" ? it.props.date : "";
            it.props.date = date + cur.slice(10);
          });
        }}
      />
    </div>
  );
}
