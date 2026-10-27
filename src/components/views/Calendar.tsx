import type { Item } from "../../lib/types";
import { dateProp, groupOf, optOf, statusProp } from "../../lib/model";
import { DOW, MONTHS, pad, today, ymd } from "../../lib/util";
import { openPeek, useStore } from "../../store";
import type { ViewProps } from "../DbPage";

export function Calendar({ page, db, list, create }: ViewProps) {
  const month = useStore((s) => s.ui.calMonth[page.id]);
  const setUi = useStore((s) => s.setUi);
  const dp = dateProp(db);
  if (!dp) return <div className="empty">Adicione uma propriedade do tipo Data para usar o calendário.</div>;
  const sp = statusProp(db);
  const T = today();
  const [Y, M] = (month || T.slice(0, 7)).split("-").map(Number);
  const first = new Date(Y, M - 1, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());

  const byDay: Record<string, { it: Item; ghost: boolean; time: string }[]> = {};
  const push = (d: string, e: { it: Item; ghost: boolean; time: string }) => { (byDay[d] = byDay[d] || []).push(e); };
  for (const it of list) {
    const d = it.props[dp.id];
    if (typeof d === "string" && d) push(d.slice(0, 10), { it, ghost: false, time: d.slice(11, 16) });
    if (db.srs && it.review?.next && groupOf(db, it) === "done") push(it.review.next, { it, ghost: true, time: "" });
  }
  const setMonth = (k: number) => {
    const d = new Date(Y, M - 1 + k, 1);
    setUi((u) => { u.calMonth[page.id] = d.getFullYear() + "-" + pad(d.getMonth() + 1); });
  };

  const days: JSX.Element[] = [];
  for (let k = 0; k < 42; k++) {
    const d = new Date(start);
    d.setDate(start.getDate() + k);
    if (k === 35 && d.getMonth() !== M - 1) break;
    const ds = ymd(d);
    const evs = (byDay[ds] || []).sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
    days.push(
      <div key={ds} className={"day" + (d.getMonth() !== M - 1 ? " out" : "") + (ds === T ? " today" : "")}>
        <button className="iconbtn add" style={{ width: 20, height: 20 }} title="Novo item neste dia" aria-label={"Novo item em " + ds} onClick={() => create({ [dp.id]: ds })}>＋</button>
        <div className="dn"><span>{d.getDate()}</span></div>
        {evs.map(({ it, ghost, time }) => (
          <button key={it.id + (ghost ? "-r" : "")} className={"ev" + (ghost ? " ghost" : "")} data-c={optOf(sp, sp ? it.props[sp.id] : undefined)?.color ?? "gray"}
            title={(ghost ? "Revisão: " : "") + (it.title || "Sem título")} onClick={() => openPeek(it.id)}>
            {ghost ? "↻ " : time ? time + " " : ""}{it.title || "Sem título"}
          </button>
        ))}
      </div>,
    );
  }
  return (
    <div>
      <div className="calbar">
        <h3>{MONTHS[M - 1]} {Y}</h3>
        <button className="iconbtn" aria-label="Mês anterior" onClick={() => setMonth(-1)}>‹</button>
        <button className="btn" onClick={() => setUi((u) => { u.calMonth[page.id] = T.slice(0, 7); })}>Hoje</button>
        <button className="iconbtn" aria-label="Próximo mês" onClick={() => setMonth(1)}>›</button>
      </div>
      <div className="cal">
        <div className="calgrid">
          {DOW.map((d) => <div key={d} className="dow">{d}</div>)}
          {days}
        </div>
      </div>
      {db.srs && <p className="small muted">Itens tracejados com ↻ são revisões agendadas.</p>}
    </div>
  );
}
