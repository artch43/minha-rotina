import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Habit } from "@/lib/types";
import { firstDoneOf, streakOf } from "@/lib/model";
import { addDays, fmtDate, parseD, uid } from "@/lib/util";
import { celebrate, deleteHabit, toggleHabit, useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { EmojiPicker, useToday } from "./common";

const WEEKS = 5;

export function Habits() {
  const habits = useStore((s) => s.ws.habits);
  const T = useToday();
  const doneToday = useStore((s) => (s.ws.habitLog[T] || []).filter((id) => s.ws.habits.some((h) => h.id === id)).length);
  const mut = useStore((s) => s.mut);
  const add = () => {
    mut((w) => {
      w.habits.push({ id: uid(), name: "Novo hábito", icon: "⭐", created: T });
    });
    celebrate("Hábito criado", "Dê um nome e marque quando fizer.", "🌱");
    setTimeout(() => {
      const ins = document.querySelectorAll<HTMLInputElement>("[data-habit-name]");
      const last = ins[ins.length - 1];
      last?.focus();
      last?.select();
    }, 40);
  };
  return (
    <div className="flex w-full max-w-3xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
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
        <Card className="py-2 shadow-card">
          <CardContent className="stagger flex flex-col divide-y px-4">
            {habits.map((h, i) => (
              <HabitRow key={h.id} h={h} T={T} i={i} />
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

function HabitRow({ h, T, i }: { h: Habit; T: string; i: number }) {
  const log = useStore((s) => s.ws.habitLog);
  const mut = useStore((s) => s.mut);
  const [name, setName] = useState(h.name);
  const [history, setHistory] = useState(() => readOpen(h.id));
  const isOn = (d: string) => (log[d] || []).includes(h.id);
  // Red only for past days after the first mark: before it the habit hadn't started (gray); today still has time.
  const first = firstDoneOf(log, h.id);
  const missed = (d: string) => !!first && d > first && d < T && !isOn(d);
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
    <div
      data-del={"habit:" + h.id}
      className="flex flex-col gap-3 py-5"
      style={{ "--i": Math.min(i, 12) } as React.CSSProperties}
    >
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
          className={cn(
            "h-11 min-w-32 text-base",
            on && "pop",
            on && "bg-success text-white hover:bg-success/90 dark:text-background",
          )}
          onClick={() => toggleHabit(h.id, T)}
        >
          {on && <Check data-icon="inline-start" />}
          {on ? "Feito hoje" : "Hoje"}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:pl-14">
        <div className="flex gap-1.5" role="group" aria-label="Últimos dias">
          {week.map((d) => (
            <DayDot key={d} day={d} on={isOn(d)} today={d === T} missed={missed(d)} onClick={() => toggleHabit(h.id, d)} />
          ))}
        </div>
        <button
          className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-expanded={history}
          onClick={toggleHistory}
        >
          {history ? <ChevronUp className="size-4" aria-hidden="true" /> : <ChevronDown className="size-4" aria-hidden="true" />}
          {history ? "Esconder histórico" : "Ver histórico"}
        </button>
        <Button variant="ghost" size="icon-sm" aria-label={`Excluir ${h.name}`} onClick={() => deleteHabit(h.id)}>
          <Trash2 />
        </Button>
      </div>
      {history && <History T={T} isOn={isOn} missed={missed} onToggle={(d) => toggleHabit(h.id, d)} />}
    </div>
  );
}

function DayDot({
  day,
  on,
  today: isToday,
  missed,
  onClick,
}: {
  day: string;
  on: boolean;
  today?: boolean;
  missed?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={on}
      aria-label={`${isToday ? "Hoje" : fmtDate(day)}${on ? ", feito" : missed ? ", não feito" : ""}`}
      title={isToday ? "Hoje" : fmtDate(day)}
      onClick={onClick}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:size-9",
        on
          ? "pop bg-success text-white dark:text-background"
          : missed
            ? "bg-(--tag-red-bg) text-(--tag-red-fg) hover:brightness-95"
            : "bg-muted text-muted-foreground hover:bg-accent",
        isToday && "ring-2 ring-primary ring-offset-2 ring-offset-card",
      )}
    >
      {parseD(day).getDate()}
    </button>
  );
}

/** The last few weeks, Monday first, for looking back and fixing a missed mark. */
function History({
  T,
  isOn,
  missed,
  onToggle,
}: {
  T: string;
  isOn: (d: string) => boolean;
  missed: (d: string) => boolean;
  onToggle: (d: string) => void;
}) {
  const dow = (parseD(T).getDay() + 6) % 7;
  const start = addDays(T, -dow - 7 * (WEEKS - 1));
  const days = Array.from({ length: WEEKS * 7 }, (_, k) => addDays(start, k));
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-muted/40 p-3 sm:ml-14">
      <div className="grid w-max grid-cols-7 gap-1.5 text-center text-xs text-muted-foreground">
        {["seg", "ter", "qua", "qui", "sex", "sáb", "dom"].map((d) => (
          <span key={d} className="w-8 sm:w-9">
            {d}
          </span>
        ))}
        {days.map((d) =>
          d > T ? (
            <span key={d} className="size-8 sm:size-9" />
          ) : (
            <DayDot key={d} day={d} on={isOn(d)} today={d === T} missed={missed(d)} onClick={() => onToggle(d)} />
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
