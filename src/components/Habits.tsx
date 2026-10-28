import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Habit } from "@/lib/types";
import { streakOf } from "@/lib/model";
import { addDays, fmtDate, parseD, today, uid } from "@/lib/util";
import { deleteHabit, toggleHabit, useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { EmojiPicker } from "./common";

const N = 28;

export function Habits() {
  const habits = useStore((s) => s.ws.habits);
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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 md:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Hábitos</h1>
          <p className="text-sm text-muted-foreground">
            Marque os dias em que cumpriu cada hábito. Os mais recentes ficam à direita.
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
  const T = today();
  const days = Array.from({ length: N }, (_, k) => addDays(T, -(N - 1 - k)));
  const total = days.filter((d) => (log[d] || []).includes(h.id)).length;
  const edit = (fn: (x: Habit) => void) => mut((w) => fn(w.habits.find((x) => x.id === h.id)!));
  const remove = () => deleteHabit(h.id);
  return (
    <div data-del={"habit:" + h.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-center">
      <div className="flex min-w-0 items-center gap-1 md:w-56">
        <EmojiPicker
          value={h.icon}
          onChange={(icon) =>
            edit((x) => {
              x.icon = icon;
            })
          }
        />
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
          className="min-w-0 flex-1 rounded-md bg-transparent px-1 py-1 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: "thin" }}>
        {days.map((d) => {
          const on = (log[d] || []).includes(h.id);
          return (
            <button
              key={d}
              aria-pressed={on}
              aria-label={`${fmtDate(d)}${on ? ", feito" : ""}`}
              title={fmtDate(d)}
              onClick={() => toggleHabit(h.id, d)}
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-md text-[10px] tabular-nums transition-colors",
                on ? "bg-success text-white dark:text-background" : "bg-muted text-muted-foreground hover:bg-accent",
                d === T && "ring-2 ring-primary ring-offset-1 ring-offset-card",
              )}
            >
              {parseD(d).getDate()}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground tabular-nums">
        <span title="Dias seguidos">
          🔥 <b className="text-foreground">{streakOf(log, h.id)}</b>
        </span>
        <span>
          · {total}/{N}
        </span>
        <Button variant="ghost" size="icon-sm" aria-label={`Excluir ${h.name}`} onClick={remove}>
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}
