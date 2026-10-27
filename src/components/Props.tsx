import { useState } from "react";
import type { Database, Item, Option, Prop, PropValue } from "../lib/types";
import { groupOf, optOf } from "../lib/model";
import { COLORS, addDays, fmtDate, today, uid } from "../lib/util";
import { closePop, openPop, setProp, useStore } from "../store";
import { Tag } from "./ui";

export function PropDisplay({ prop, value, item, db }: { prop: Prop; value: PropValue | undefined; item?: Item; db?: Database }) {
  if (value == null || value === "" || (Array.isArray(value) && !value.length)) return null;
  switch (prop.type) {
    case "status": return <Tag opt={optOf(prop, value)} status />;
    case "select": return <Tag opt={optOf(prop, value)} />;
    case "multi": return <>{(value as string[]).map((id) => <Tag key={id} opt={optOf(prop, id)} />)}</>;
    case "date": {
      const v = String(value);
      const late = v.slice(0, 10) < today() && !(item && db && groupOf(db, item) === "done");
      return <span className={"meta" + (late ? " late" : "")}>▦ {fmtDate(v)}</span>;
    }
    case "checkbox": return value ? <span className="meta">☑ {prop.name}</span> : null;
    case "number": return <span className="meta">{String(value)}</span>;
    case "url": {
      const v = String(value);
      return <a className="small" href={/^https?:\/\//.test(v) ? v : "https://" + v} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>{v.replace(/^https?:\/\//, "")}</a>;
    }
    default: return <span className="small muted">{String(value)}</span>;
  }
}

/** Opens the right editor for a property value next to `anchor`. */
export function editProp(anchor: HTMLElement, itemId: string, propId: string) {
  const { ws } = useStore.getState();
  const item = ws.items[itemId];
  const prop = item && ws.dbs[item.db]?.props.find((p) => p.id === propId);
  if (!prop) return;
  if (prop.type === "checkbox") { setProp(itemId, propId, !item.props[propId]); return; }
  openPop(anchor, <PropEditor itemId={itemId} propId={propId} />);
}

function PropEditor({ itemId, propId }: { itemId: string; propId: string }) {
  const item = useStore((s) => s.ws.items[itemId]);
  const prop = useStore((s) => (item ? s.ws.dbs[item.db]?.props.find((p) => p.id === propId) : undefined));
  if (!item || !prop) return null;
  const v = item.props[propId];
  const set = (val: PropValue | null) => setProp(itemId, propId, val);

  if (prop.type === "status" || prop.type === "select") return (
    <>
      <h6>{prop.name}</h6>
      {prop.options!.map((o) => (
        <button key={o.id} className={"mi" + (v === o.id ? " sel" : "")} onClick={() => { closePop(); set(o.id); }}>
          <Tag opt={o} status={prop.type === "status"} />{v === o.id && <span className="sub">✓</span>}
        </button>
      ))}
      {prop.type === "select" && <NewOption dbId={item.db} propId={propId} onAdd={(o) => { closePop(); set(o.id); }} />}
      {v && <><hr /><button className="mi" onClick={() => { closePop(); set(null); }}>Limpar</button></>}
    </>
  );
  if (prop.type === "multi") {
    const cur = (v as string[] | undefined) || [];
    return (
      <>
        <h6>{prop.name}</h6>
        {prop.options!.map((o) => (
          <button key={o.id} className="mi" onClick={() => set(cur.includes(o.id) ? cur.filter((x) => x !== o.id) : [...cur, o.id])}>
            <Tag opt={o} />{cur.includes(o.id) && <span className="sub">✓</span>}
          </button>
        ))}
        <NewOption dbId={item.db} propId={propId} onAdd={(o) => set([...cur, o.id])} />
      </>
    );
  }
  if (prop.type === "date") return <DateEditor value={typeof v === "string" ? v : ""} name={prop.name} onSet={set} />;
  return <TextEditor value={v == null ? "" : String(v)} prop={prop} onSet={set} />;
}

function DateEditor({ value, name, onSet }: { value: string; name: string; onSet: (v: string | null) => void }) {
  const [d, setD] = useState(value ? value.slice(0, 10) : today());
  const [t, setT] = useState(value ? value.slice(11, 16) : "");
  const apply = (dd: string, tt: string) => { if (dd) onSet(dd + (tt ? " " + tt : "")); };
  return (
    <>
      <h6>{name}</h6>
      <div className="field">
        <label className="small muted" htmlFor="dt-d">Dia</label>
        <input id="dt-d" className="inp" type="date" value={d} onChange={(e) => { setD(e.target.value); apply(e.target.value, t); }} />
        <label className="small muted" htmlFor="dt-t">Horário (opcional)</label>
        <input id="dt-t" className="inp" type="time" value={t} onChange={(e) => { setT(e.target.value); apply(d, e.target.value); }} />
      </div>
      <div className="swatches">
        {([["Hoje", 0], ["Amanhã", 1], ["Em 1 semana", 7]] as const).map(([n, k]) => (
          <button key={n} className="btn small" onClick={() => { closePop(); apply(addDays(today(), k), t); }}>{n}</button>
        ))}
      </div>
      <hr />
      <button className="mi" onClick={() => { closePop(); onSet(null); }}>Limpar data</button>
    </>
  );
}

function TextEditor({ value, prop, onSet }: { value: string; prop: Prop; onSet: (v: PropValue | null) => void }) {
  const [v, setV] = useState(value);
  const commit = () => { const raw = v.trim(); onSet(prop.type === "number" ? (raw === "" ? null : Number(raw)) : raw); };
  return (
    <>
      <h6>{prop.name}</h6>
      <div className="field">
        <input id="pv-inp" className="inp" type={prop.type === "number" ? "number" : "text"} value={v} placeholder={prop.type === "url" ? "https://…" : ""}
          onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") { commit(); closePop(); } }} />
      </div>
    </>
  );
}

export function NewOption({ dbId, propId, onAdd }: { dbId: string; propId: string; onAdd: (o: Option) => void }) {
  const [name, setName] = useState("");
  return (
    <div className="field">
      <input className="inp" placeholder="Criar opção e teclar Enter" value={name} onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          const n = name.trim();
          if (e.key !== "Enter" || !n) return;
          const { ws, mut } = useStore.getState();
          const prop = ws.dbs[dbId].props.find((p) => p.id === propId)!;
          let o = prop.options!.find((x) => x.name.toLowerCase() === n.toLowerCase());
          if (!o) {
            o = { id: uid(), name: n, color: COLORS[(prop.options!.length + 3) % COLORS.length] };
            const created = o;
            mut((w) => { w.dbs[dbId].props.find((p) => p.id === propId)!.options!.push(created); });
          }
          setName("");
          onAdd(o);
        }} />
    </div>
  );
}
