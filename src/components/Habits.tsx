import { useState } from "react";
import type { Habit } from "../lib/types";
import { streakOf } from "../lib/model";
import { addDays, fmtDate, parseD, today, uid } from "../lib/util";
import { closePop, openPop, toggleHabit, useStore } from "../store";
import { IconMenu } from "./PageView";
import { Confirm } from "./ui";

const N = 28;

export function Habits() {
  const habits = useStore((s) => s.ws.habits);
  const mut = useStore((s) => s.mut);
  const add = () => {
    mut((w) => {
      w.habits.push({ id: uid(), name: "Novo hábito", icon: "⭐" });
    });
    setTimeout(() => {
      const ins = document.querySelectorAll<HTMLInputElement>(".hab .hn input");
      const last = ins[ins.length - 1];
      last?.focus();
      last?.select();
    }, 40);
  };
  return (
    <div className="page-inner">
      <p className="muted">Marque cada dia em que cumpriu o hábito. Os quadrados mais à direita são os dias mais recentes.</p>
      {habits.map((h) => (
        <HabitRow key={h.id} h={h} />
      ))}
      <button className="addrow" style={{ marginTop: 8 }} onClick={add}>
        ＋ Novo hábito
      </button>
    </div>
  );
}

function HabitRow({ h }: { h: Habit }) {
  const log = useStore((s) => s.ws.habitLog);
  const mut = useStore((s) => s.mut);
  const [name, setName] = useState(h.name);
  const T = today();
  const days = Array.from({ length: N }, (_, k) => addDays(T, -k));
  const total = days.filter((d) => (log[d] || []).includes(h.id)).length;
  const edit = (fn: (x: Habit) => void) => mut((w) => fn(w.habits.find((x) => x.id === h.id)!));
  return (
    <div className="hab">
      <div className="hn">
        <button
          className="iconbtn"
          aria-label="Trocar ícone"
          onClick={(e) =>
            openPop(
              e.currentTarget,
              <IconMenu
                onPick={(icon) =>
                  edit((x) => {
                    x.icon = icon;
                  })
                }
              />,
            )
          }
        >
          {h.icon}
        </button>
        <input
          value={name}
          aria-label="Nome do hábito"
          onChange={(e) => setName(e.target.value)}
          onBlur={() =>
            edit((x) => {
              x.name = name.trim() || x.name;
            })
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
      </div>
      <div className="hdays">
        {days.map((d) => {
          const on = (log[d] || []).includes(h.id);
          return (
            <button
              key={d}
              className={(on ? "on" : "") + (d === T ? " td" : "")}
              title={fmtDate(d) + (on ? ": feito" : "")}
              aria-label={fmtDate(d) + (on ? ", feito" : ", não feito")}
              aria-pressed={on}
              onClick={() => toggleHabit(h.id, d)}
            >
              {parseD(d).getDate()}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="streak">
          🔥 <b>{streakOf(log, h.id)}</b> · {total}/{N}
        </span>
        <button
          className="iconbtn"
          title="Excluir hábito"
          aria-label="Excluir hábito"
          onClick={(e) =>
            openPop(
              e.currentTarget,
              <Confirm
                text={`Excluir “${h.name}”?`}
                onYes={() => {
                  mut((w) => {
                    w.habits = w.habits.filter((x) => x.id !== h.id);
                  });
                  closePop();
                }}
              />,
            )
          }
        >
          ×
        </button>
      </div>
    </div>
  );
}
