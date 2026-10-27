import type { Database, Group, Item, Page } from "../lib/types";
import { dateOf, firstOptInGroup, groupOf, itemsOf, statusProp, streakOf } from "../lib/model";
import { DOW, addDays, diffDays, fmtDate, parseD, today, ymd } from "../lib/util";
import { go, openPeek, setProp, toast, toggleHabit, useStore } from "../store";

interface Row {
  it: Item;
  db: Database;
  g: Group | null;
  page?: Page;
}

export function Home() {
  const ws = useStore((s) => s.ws);
  const T = today(),
    now = new Date(),
    hr = now.getHours();
  const hello =
    (hr < 5 ? "Boa noite" : hr < 12 ? "Bom dia" : hr < 18 ? "Boa tarde" : "Boa noite") +
    (ws.settings.name ? ", " + ws.settings.name : "");
  const rows: Row[] = Object.values(ws.items)
    .filter((it) => ws.dbs[it.db])
    .map((it) => ({ it, db: ws.dbs[it.db], g: groupOf(ws.dbs[it.db], it), page: ws.pages.find((p) => p.id === it.db) }));
  const reviews = rows.filter((x) => x.g === "review");
  const doing = rows.filter((x) => x.g === "doing");
  const dueToday = rows
    .filter((x) => dateOf(x.db, x.it).slice(0, 10) === T && x.g !== "done" && x.g !== "review")
    .sort((a, b) => dateOf(a.db, a.it).localeCompare(dateOf(b.db, b.it)));
  const late = rows.filter((x) => {
    const d = dateOf(x.db, x.it);
    return d && d.slice(0, 10) < T && x.g !== "done";
  });

  return (
    <div className="page-inner">
      <div className="greet">{hello}</div>
      <div className="greet-sub">
        {now
          .toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
          .replace(/^./, (c) => c.toUpperCase())}
      </div>
      <div className="homegrid">
        <div>
          <Section
            title="Com data para hoje"
            rows={dueToday}
            empty="Nada marcado para hoje."
            extra={(x) => {
              const d = dateOf(x.db, x.it);
              return d.length > 10 ? <span className="meta">{d.slice(11, 16)}</span> : null;
            }}
          />
          <Section title="Revisões pendentes" rows={reviews} empty="Nenhuma revisão para fazer agora." />
          <Section title="Em andamento" rows={doing} empty="Nada em andamento. Escolha algo para começar!" />
          {late.length > 0 && (
            <Section
              title="Atrasados"
              rows={late}
              empty=""
              extra={(x) => <span className="meta late">{fmtDate(dateOf(x.db, x.it))}</span>}
            />
          )}
        </div>
        <div>
          <HabitsToday />
          <Suggestions rows={rows} late={late} reviews={reviews} doing={doing} />
          <Stats rows={rows} />
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  rows,
  empty,
  extra,
}: {
  title: string;
  rows: Row[];
  empty: string;
  extra?: (x: Row) => JSX.Element | null;
}) {
  return (
    <div className="sec">
      <h2>
        {title} <span className="cnt">{rows.length}</span>
      </h2>
      {rows.length ? (
        rows.slice(0, 12).map((x) => {
          const done = firstOptInGroup(x.db, "done");
          const sp = statusProp(x.db);
          return (
            <div
              key={x.it.id}
              className="hrow"
              role="button"
              tabIndex={0}
              onClick={() => openPeek(x.it.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") openPeek(x.it.id);
              }}
            >
              {done && sp && (
                <button
                  className="tick"
                  title="Marcar como concluído"
                  aria-label={"Concluir " + (x.it.title || "item")}
                  onClick={(e) => {
                    e.stopPropagation();
                    const snap = x.it;
                    setProp(x.it.id, sp.id, done);
                    toast("Concluído: " + (x.it.title || "item"), () =>
                      useStore.getState().mut((w) => {
                        w.items[snap.id] = snap;
                      }),
                    );
                  }}
                >
                  ✓
                </button>
              )}
              <span className="ttl">{x.it.title || "Sem título"}</span>
              {extra?.(x)}
              <span className="src">{x.page ? `${x.page.icon} ${x.page.title}` : ""}</span>
            </div>
          );
        })
      ) : (
        <p className="muted small" style={{ margin: "4px 6px" }}>
          {empty}
        </p>
      )}
    </div>
  );
}

function HabitsToday() {
  const habits = useStore((s) => s.ws.habits);
  const log = useStore((s) => s.ws.habitLog);
  const T = today();
  const doneN = habits.filter((x) => (log[T] || []).includes(x.id)).length;
  return (
    <div className="sec">
      <h2>
        Hábitos de hoje{" "}
        <span className="cnt">
          {doneN}/{habits.length}
        </span>
      </h2>
      {habits.length ? (
        habits.map((x) => {
          const on = (log[T] || []).includes(x.id),
            st = streakOf(log, x.id);
          return (
            <div
              key={x.id}
              className="hrow"
              role="button"
              tabIndex={0}
              aria-pressed={on}
              onClick={() => toggleHabit(x.id, T)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleHabit(x.id, T);
                }
              }}
            >
              <span className={"tick" + (on ? " on" : "")} aria-hidden="true">
                ✓
              </span>
              <span className="ttl">
                {x.icon} {x.name}
              </span>
              {st > 0 && (
                <span className="streak" title="Dias seguidos">
                  🔥 {st}
                </span>
              )}
            </div>
          );
        })
      ) : (
        <p className="muted small">Crie hábitos na página Hábitos.</p>
      )}
      <button className="addrow" onClick={() => go("habits")}>
        Ver todos os hábitos →
      </button>
    </div>
  );
}

function Suggestions({ rows, late, reviews, doing }: { rows: Row[]; late: Row[]; reviews: Row[]; doing: Row[] }) {
  const T = today();
  const out: [string, string][] = [];
  if (reviews.length)
    out.push([
      "info",
      `Você tem ${reviews.length} ${reviews.length === 1 ? "revisão pendente" : "revisões pendentes"}. Revisar no dia certo ajuda a fixar o conteúdo.`,
    ]);
  if (late.length)
    out.push([
      "bad",
      `${late.length} ${late.length === 1 ? "item está atrasado" : "itens estão atrasados"}. Remarque ou conclua para limpar a lista.`,
    ]);
  const stalled = doing.filter((x) => Date.now() - (x.it.updated || 0) > 5 * 864e5);
  if (stalled.length)
    out.push(["warn", `“${stalled[0].it.title || "Sem título"}” está em andamento há mais de 5 dias sem mudanças.`]);
  if (doing.length > 5)
    out.push(["warn", `${doing.length} itens em andamento ao mesmo tempo. Focar em 2 ou 3 costuma render mais.`]);
  const noDate = rows.filter((x) => x.g === "todo" && !dateOf(x.db, x.it));
  if (noDate.length >= 3) out.push(["info", `${noDate.length} itens não começados estão sem data. Defina quando vai fazê-los.`]);
  const week = Array.from({ length: 7 }, (_, k) => addDays(T, k));
  const free = week.findIndex((d, k) => k > 0 && !rows.some((x) => dateOf(x.db, x.it).slice(0, 10) === d));
  if (free > 0 && noDate.length) {
    const d = parseD(week[free]);
    out.push([
      "info",
      `${DOW[d.getDay()].replace(/^./, (c) => c.toUpperCase())} (${d.getDate()}) está livre: um bom dia para encaixar “${noDate[0].it.title || "um item sem data"}”.`,
    ]);
  }
  if (!out.length) out.push(["info", "Tudo em dia. Bom trabalho!"]);
  return (
    <div className="sec">
      <h2>Sugestões</h2>
      {out.map(([k, t], i) => (
        <div key={i} className={"sugg " + k}>
          <span className="si" />
          <p>{t}</p>
        </div>
      ))}
    </div>
  );
}

function Stats({ rows }: { rows: Row[] }) {
  const ws = useStore((s) => s.ws);
  const weeks = 8,
    T = today();
  const startOfWeek = (s: string) => addDays(s, -parseD(s).getDay());
  const w0 = startOfWeek(T);
  const counts = Array(weeks).fill(0) as number[];
  for (const { it } of rows)
    for (const l of it.log || []) {
      if (l.g !== "done") continue;
      const k = diffDays(w0, startOfWeek(ymd(new Date(l.t)))) / 7;
      if (k >= 0 && k < weeks) counts[weeks - 1 - k]++;
    }
  const max = Math.max(1, ...counts);
  const weekStart = (k: number) => parseD(addDays(w0, -(weeks - 1 - k) * 7));
  return (
    <div className="sec">
      <h2>Estatísticas</h2>
      {ws.pages
        .filter((p) => p.type === "db" && ws.dbs[p.id])
        .map((p) => {
          const db = ws.dbs[p.id],
            sp = statusProp(db),
            its = itemsOf(ws, p.id);
          if (!sp) return null;
          const parts = sp.options!.map((o) => ({ o, n: its.filter((i) => i.props[sp.id] === o.id).length }));
          return (
            <div key={p.id} className="dbstat">
              <div className="small" style={{ display: "flex", justifyContent: "space-between" }}>
                <button onClick={() => go(p.id)}>
                  {p.icon} {p.title}
                </button>
                <span className="meta">{its.length} itens</span>
              </div>
              <div className="stackbar" role="img" aria-label={parts.map((x) => `${x.o.name}: ${x.n}`).join(", ")}>
                {its.length ? (
                  parts
                    .filter((x) => x.n)
                    .map((x) => <span key={x.o.id} data-c={x.o.color} style={{ flex: x.n }} title={`${x.o.name}: ${x.n}`} />)
                ) : (
                  <span style={{ flex: 1, background: "var(--line)" }} />
                )}
              </div>
              <div className="legend">
                {parts.map((x) => (
                  <span key={x.o.id}>
                    <i data-c={x.o.color} />
                    {x.o.name} <b>{x.n}</b>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      <div className="small muted" style={{ margin: "18px 0 22px" }}>
        Concluídos por semana (últimas 8)
      </div>
      <div className="weekbars" role="img" aria-label={"Concluídos por semana: " + counts.join(", ")}>
        {counts.map((n, k) => {
          const d = weekStart(k);
          return (
            <div
              key={k}
              className="col-w"
              title={`Semana de ${d.getDate()}/${d.getMonth() + 1}: ${n} ${n === 1 ? "concluído" : "concluídos"}`}
            >
              <div className={"wb" + (n ? "" : " zero")} style={{ height: (n / max) * 100 + "%" }}>
                {n > 0 && k === weeks - 1 && <span className="wbval">{n}</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="weeklabels">
        {counts.map((_, k) => {
          const d = weekStart(k);
          return <span key={k}>{k === weeks - 1 ? "esta" : `${d.getDate()}/${d.getMonth() + 1}`}</span>;
        })}
      </div>
    </div>
  );
}
