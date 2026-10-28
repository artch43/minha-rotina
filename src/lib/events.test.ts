import { describe, expect, it } from "vitest";
import { alertLabel, eventsByDay, monthGrid, remindersFor, startOf, weekOf } from "./events";
import type { CalendarEvent, Workspace } from "./types";

const ev = (p: Partial<CalendarEvent>): CalendarEvent => ({
  id: "e1",
  title: "Dentista",
  date: "2026-10-30",
  allDay: false,
  start: "15:00",
  end: "16:00",
  location: "",
  notes: "",
  alerts: [],
  created: 0,
  updated: 0,
  ...p,
});

describe("eventos e alertas", () => {
  it("calcula o horário de cada alerta no fuso do navegador", () => {
    const rows = remindersFor(ev({ alerts: [30, 0, 1440] }), new Date(2026, 9, 28, 10, 0));
    expect(
      rows.map((r) => new Date(r.send_at).toLocaleString("pt-BR", { day: "2-digit", hour: "2-digit", minute: "2-digit" })),
    ).toEqual(["29, 15:00", "30, 14:30", "30, 15:00"]);
    expect(rows[0].when_label).toBe("sexta-feira, 30 de outubro às 15:00");
  });

  it("usa 9:00 como referência para eventos de dia inteiro", () => {
    const rows = remindersFor(ev({ allDay: true, alerts: [60] }), new Date(2026, 9, 28));
    expect(new Date(rows[0].send_at).getHours()).toBe(8);
    expect(rows[0].when_label).toContain("dia inteiro");
  });

  it("ignora alertas que já passaram e alertas repetidos", () => {
    const rows = remindersFor(ev({ alerts: [10080, 30, 30] }), new Date(2026, 9, 28, 10, 0));
    expect(rows).toHaveLength(1);
  });

  it("descreve alertas personalizados", () => {
    expect(alertLabel(30)).toBe("30 min antes");
    expect(alertLabel(2880)).toBe("2 dias antes");
    expect(alertLabel(120)).toBe("2 horas antes");
    expect(alertLabel(45)).toBe("45 min antes");
  });

  it("agrupa por dia, respeita a área e ordena pelo horário", () => {
    const ws = {
      events: {
        a: ev({ id: "a", start: "18:00", area: "pessoal" }),
        b: ev({ id: "b", start: "08:00", area: "pessoal" }),
        c: ev({ id: "c", allDay: true, area: "profissional" }),
        d: ev({ id: "d", date: "2026-12-01" }),
      },
    } as unknown as Workspace;
    expect(eventsByDay(ws, "2026-10-01", "2026-10-31")["2026-10-30"].map((e) => e.id)).toEqual(["c", "b", "a"]);
    expect(eventsByDay(ws, "2026-10-01", "2026-10-31", "pessoal")["2026-10-30"].map((e) => e.id)).toEqual(["b", "a"]);
  });

  it("monta a semana e o mês começando no domingo", () => {
    expect(weekOf("2026-10-28")).toEqual([
      "2026-10-25",
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
    ]);
    const m = monthGrid("2026-10-15");
    expect(m[0]).toBe("2026-09-27");
    expect(m.length % 7).toBe(0);
    expect(startOf(ev({})).getHours()).toBe(15);
  });
});
