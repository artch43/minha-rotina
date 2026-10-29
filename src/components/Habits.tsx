import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Habit } from "@/lib/types";
import { streakOf } from "@/lib/model";
import { addDays, fmtDate, parseD, today, uid } from "@/lib/util";
import { deleteHabit, toggleHabit, useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { EmojiPicker } from "./common";

const WEEKS = 5;

export function Habits() {
  const habits = useStore((s) => s.ws.habits);
  const doneToday = useStore((s) => (s.ws.habitLog[today()] || []).filter((id) => s.ws.habits.some((h) => h.id === id)).length);
  const mut = useStore((s) => s.mut);
  const add = () => {
    mut((w) => {
      w.habits.push({ id: uid(), name: "Novo hábito", icon: "⭐" });
    });
    setTimeout(() => {
      const ins = document.querySelectorAll<HTMLInputElement>("[data-habit-name]");
      const last = ins[ins.length - 1];
      last?.focus();
      last?.select();
    }, 40);
  };
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Hábitos</h1>
          <p className="text-base text-muted-foreground">
            {habits.length
              ? `Hoje: ${doneToday} de ${habits.length} feitos`
              : "Pequenas coisas que você quer fazer com frequência."}
          </p>
        </div>
        <Button onClick={add}>
          <Plus data-icon="inline-start" />
          Novo hábito
        </Button>
      </div>
      {habits.length ? (
        <Card className="py-2">
          <CardContent className="flex flex-col divide-y px-4">
            {habits.map((h) => (
              <HabitRow key={h.id} h={h} />
            ))}
          </CardContent>
        </Card>
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Nenhum hábito ainda</EmptyTitle>
            <EmptyDescription>Comece com algo pequeno, como ler 10 minutos por dia.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={add}>Criar hábito</Button>
          </EmptyContent>
        </Empty>
      )}
    </div>
  );
}

function HabitRow({ h }: { h: Habit }) {
  const log = useStore((s) => s.ws.habitLog);
  const mut = useStore((s) => s.mut);
  const [name, setName] = useState(h.name);
  const [history, setHistory] = useState(() => readOpen(h.id));
  const T = today();
  const isOn = (d: string) => (log[d] || []).includes(h.id);
  // Oldest on the left, today last.
  const week = Array.from({ length: 7 }, (_, k) => addDays(T, k - 6));
  const streak = streakOf(log, h.id);
  const edit = (fn: (x: Habit) => void) => mut((w) => fn(w.habits.find((x) => x.id === h.id)!));
  const on = isOn(T);
  const toggleHistory = () => {
    setHistory(!history);
    saveOpen(h.id, !history);
  };
  return (
    <div data-del={"habit:" + h.id} className="flex flex-col gap-3 py-5">
      <div className="flex items-center gap-3">
        <EmojiPicker
          value={h.icon}
          onChange={(icon) =>
            edit((x) => {
              x.icon = icon;
            })
          }
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <input
            data-habit-name
            aria-label="Nome do hábito"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() =>
              edit((x) => {
                x.name = name.trim() || x.name;
              })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            className="min-w-0 rounded-md bg-transparent px-1 py-0.5 text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span className="px-1 text-sm text-muted-foreground">
            {streak ? (
              <>
                🔥 <b className="font-semibold text-foreground tabular-nums">{streak}</b>{" "}
                {streak === 1 ? "dia seguido" : "dias seguidos"}
              </>
            ) : (
              "Comece hoje"
            )}
          </span>
        </div>
        <Button
          variant={on ? "default" : "outline"}
          aria-pressed={on}
          size="lg"
          className={cn("h-11 min-w-32 text-base", on && "bg-success text-white hover:bg-success/90 dark:text-background")}
          onClick={() => toggleHabit(h.id, T)}
        >
          {on && <Check data-icon="inline-start" />}
          {on ? "Feito hoje" : "Hoje"}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pl-14">
        <div className="flex gap-1.5" role="group" aria-label="Últimos dias">
          {week.map((d) => (
            <DayDot key={d} day={d} on={isOn(d)} today={d === T} onClick={() => toggleHabit(h.id, d)} />
          ))}
        </div>
        <button
          className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-expanded={history}
          onClick={toggleHistory}
        >
          {history ? (
            <ChevronUp className="size-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="size-4" aria-hidden="true" />
          )}
          {history ? "Esconder histórico" : "Ver histórico"}
        </button>
        <Button variant="ghost" size="icon-sm" aria-label={`Excluir ${h.name}`} onClick={() => deleteHabit(h.id)}>
          <Trash2 />
        </Button>
      </div>
      {history && <History isOn={isOn} onToggle={(d) => toggleHabit(h.id, d)} />}
    </div>
  );
}

function DayDot({ day, on, today: isToday, onClick }: { day: string; on: boolean; today?: boolean; onClick: () => void }) {
  return (
    <button
      aria-pressed={on}
      aria-label={`${isToday ? "Hoje" : fmtDate(day)}${on ? ", feito" : ""}`}
      title={isToday ? "Hoje" : fmtDate(day)}
      onClick={onClick}
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        on ? "bg-success text-white dark:text-background" : "bg-muted text-muted-foreground hover:bg-accent",
        isToday && "ring-2 ring-primary ring-offset-2 ring-offset-card",
      )}
    >
      {parseD(day).getDate()}
    </button>
  );
}

/** The last few weeks, Monday first, for looking back and fixing a missed mark. */
function History({ isOn, onToggle }: { isOn: (d: string) => boolean; onToggle: (d: string) => void }) {
  const T = today();
  const dow = (parseD(T).getDay() + 6) % 7;
  const start = addDays(T, -dow - 7 * (WEEKS - 1));
  const days = Array.from({ length: WEEKS * 7 }, (_, k) => addDays(start, k));
  return (
    <div className="ml-14 flex flex-col gap-1.5 rounded-xl bg-muted/40 p-3">
      <div className="grid w-max grid-cols-7 gap-1.5 text-center text-xs text-muted-foreground">
        {["seg", "ter", "qua", "qui", "sex", "sáb", "dom"].map((d) => (
          <span key={d} className="w-9">
            {d}
          </span>
        ))}
        {days.map((d) =>
          d > T ? (
            <span key={d} className="size-9" />
          ) : (
            <DayDot key={d} day={d} on={isOn(d)} today={d === T} onClick={() => onToggle(d)} />
          ),
        )}
      </div>
    </div>
  );
}

const histKey = (id: string) => "habit-history-" + id;
function readOpen(id: string) {
  try {
    return localStorage.getItem(histKey(id)) === "1";
  } catch {
    return false;
  }
}
function saveOpen(id: string, open: boolean) {
  try {
    if (open) localStorage.setItem(histKey(id), "1");
    else localStorage.removeItem(histKey(id));
  } catch {
    /* private mode: just don't remember */
  }
}
