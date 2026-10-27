import { useState } from "react";
import type { Database, Option, Prop, PropType, View, ViewType } from "../lib/types";
import { COLORS, COLOR_NAMES, GROUPS, PICONS, PTYPES, uid } from "../lib/util";
import { statusProp } from "../lib/model";
import { closePop, openPop, useStore } from "../store";
import { Confirm, Tag } from "./ui";

const VIEW_TYPES: [ViewType, string][] = [["board", "Quadro"], ["table", "Tabela"], ["list", "Lista"], ["calendar", "Calendário"]];

function useDb(dbId: string) {
  const db = useStore((s) => s.ws.dbs[dbId]);
  const mut = useStore((s) => s.mut);
  const mutDb = (fn: (d: Database) => void) => mut((w) => fn(w.dbs[dbId]));
  return { db, mutDb };
}
function useView(dbId: string, viewId: string) {
  const { db, mutDb } = useDb(dbId);
  const view = db?.views.find((v) => v.id === viewId);
  const mutView = (fn: (v: View) => void) => mutDb((d) => fn(d.views.find((v) => v.id === viewId)!));
  return { db, view, mutView, mutDb };
}

export function ViewMenu({ dbId, viewId }: { dbId: string; viewId: string }) {
  const { db, view, mutView, mutDb } = useView(dbId, viewId);
  const [name, setName] = useState(view?.name ?? "");
  if (!db || !view) return null;
  return (
    <>
      <h6>Visão</h6>
      <div className="field">
        <input id="vname" className="inp" aria-label="Nome da visão" value={name} onChange={(e) => setName(e.target.value)}
          onBlur={() => mutView((v) => { v.name = name.trim() || v.name; })}
          onKeyDown={(e) => { if (e.key === "Enter") { mutView((v) => { v.name = name.trim() || v.name; }); closePop(); } }} />
      </div>
      <h6>Mostrar como</h6>
      {VIEW_TYPES.map(([t, n]) => (
        <button key={t} className={"mi" + (view.type === t ? " sel" : "")} onClick={() => { mutView((v) => { v.type = t; }); closePop(); }}>
          {n}{view.type === t && <span className="sub">✓</span>}
        </button>
      ))}
      {db.views.length > 1 && <>
        <hr />
        <button className="mi danger" onClick={() => { mutDb((d) => { d.views = d.views.filter((x) => x.id !== viewId); }); closePop(); }}>Excluir visão</button>
      </>}
    </>
  );
}

export function AddViewMenu({ dbId }: { dbId: string }) {
  const { mutDb } = useDb(dbId);
  const setUi = useStore((s) => s.setUi);
  return (
    <>
      <h6>Nova visão</h6>
      {VIEW_TYPES.map(([t, n]) => (
        <button key={t} className="mi" onClick={() => {
          const v: View = { id: uid(), name: n, type: t, filters: [], hidden: [] };
          mutDb((d) => { d.views.push(v); });
          setUi((u) => { u.viewByDb[dbId] = v.id; });
          closePop();
        }}>{n}</button>
      ))}
    </>
  );
}

const DATE_OPTS: [string, string][] = [["today", "Hoje"], ["week", "Próximos 7 dias"], ["overdue", "Atrasados"], ["future", "A partir de hoje"], ["empty", "Sem data"]];

export function FilterMenu({ dbId, viewId }: { dbId: string; viewId: string }) {
  const { db, view, mutView } = useView(dbId, viewId);
  const [prop, setProp] = useState<Prop | null>(null);
  const [text, setText] = useState("");
  if (!db || !view) return null;
  const add = (f: View["filters"][number]) => { mutView((v) => { v.filters.push(f); }); closePop(); };
  if (prop) {
    if (prop.options) return (
      <>
        <h6>{prop.name}</h6>
        {prop.options.map((o) => (
          <div key={o.id} className="mi" style={{ justifyContent: "space-between" }}>
            <Tag opt={o} status={prop.type === "status"} />
            <span style={{ display: "flex", gap: 4 }}>
              <button className="btn small" onClick={() => add({ prop: prop.id, op: "is", val: o.id })}>é</button>
              {prop.type !== "multi" && <button className="btn small" onClick={() => add({ prop: prop.id, op: "isnot", val: o.id })}>não é</button>}
            </span>
          </div>
        ))}
      </>
    );
    if (prop.type === "date") return <><h6>{prop.name}</h6>{DATE_OPTS.map(([k, n]) => <button key={k} className="mi" onClick={() => add({ prop: prop.id, op: "is", val: k })}>{n}</button>)}</>;
    if (prop.type === "checkbox") return (
      <>
        <h6>{prop.name}</h6>
        <button className="mi" onClick={() => add({ prop: prop.id, op: "is", val: "true" })}>Marcado</button>
        <button className="mi" onClick={() => add({ prop: prop.id, op: "is", val: "false" })}>Desmarcado</button>
      </>
    );
    return (
      <>
        <h6>{prop.name} contém</h6>
        <div className="field"><input className="inp" autoFocus value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) add({ prop: prop.id, op: "contains", val: text.trim() }); }} /></div>
      </>
    );
  }
  return (
    <>
      <h6>Filtrar por</h6>
      {db.props.map((p) => (
        <button key={p.id} className="mi" onClick={() => setProp(p)}><span style={{ width: 18, textAlign: "center", color: "var(--faint)" }}>{PICONS[p.type]}</span>{p.name}</button>
      ))}
      {view.filters.length > 0 && <><hr /><button className="mi" onClick={() => { mutView((v) => { v.filters = []; }); closePop(); }}>Remover todos os filtros</button></>}
    </>
  );
}

export function SortMenu({ dbId, viewId }: { dbId: string; viewId: string }) {
  const { db, view, mutView } = useView(dbId, viewId);
  if (!db || !view) return null;
  const opts: [string, string][] = [["title", "Nome"], ["created", "Data de criação"], ...db.props.filter((x) => x.type !== "multi").map((x) => [x.id, x.name] as [string, string])];
  const set = (sort: View["sort"]) => { mutView((v) => { v.sort = sort; }); closePop(); };
  return (
    <>
      <h6>Ordenar por</h6>
      {opts.map(([id, n]) => (
        <div key={id} className="mi" style={{ justifyContent: "space-between" }}>{n}
          <span style={{ display: "flex", gap: 4 }}>
            <button className="btn small" aria-label={n + " crescente"} onClick={() => set({ prop: id, dir: "asc" })}>↑</button>
            <button className="btn small" aria-label={n + " decrescente"} onClick={() => set({ prop: id, dir: "desc" })}>↓</button>
          </span>
        </div>
      ))}
      {view.sort && <><hr /><button className="mi" onClick={() => set(null)}>Ordem manual</button></>}
    </>
  );
}

export function PropsMenu({ dbId, viewId, anchor }: { dbId: string; viewId: string; anchor: HTMLElement }) {
  const { db, view, mutView } = useView(dbId, viewId);
  if (!db || !view) return null;
  return (
    <>
      <h6>Propriedades visíveis nesta visão</h6>
      {db.props.map((p) => {
        const hidden = view.hidden.includes(p.id);
        return (
          <div key={p.id} className="mi">
            <span style={{ width: 18, textAlign: "center", color: "var(--faint)" }}>{PICONS[p.type]}</span>
            <button style={{ flex: 1, textAlign: "left" }} onClick={() => openPop(anchor, <PropMenu dbId={dbId} propId={p.id} />)}>{p.name}</button>
            <button className="btn small" onClick={() => mutView((v) => { v.hidden = hidden ? v.hidden.filter((x) => x !== p.id) : [...v.hidden, p.id]; })}>{hidden ? "Mostrar" : "Ocultar"}</button>
          </div>
        );
      })}
      <hr />
      <button className="mi" onClick={() => openPop(anchor, <AddPropMenu dbId={dbId} anchor={anchor} />)}>＋ Nova propriedade</button>
    </>
  );
}

export function AddPropMenu({ dbId, anchor }: { dbId: string; anchor: HTMLElement }) {
  const { mutDb } = useDb(dbId);
  return (
    <>
      <h6>Tipo da nova propriedade</h6>
      {(Object.entries(PTYPES) as [PropType, string][]).filter(([t]) => t !== "status").map(([t, n]) => (
        <button key={t} className="mi" onClick={() => {
          const pr: Prop = { id: uid(), name: n, type: t, ...(t === "select" || t === "multi" ? { options: [] } : {}) };
          mutDb((d) => { d.props.push(pr); });
          openPop(anchor, <PropMenu dbId={dbId} propId={pr.id} />);
        }}><span style={{ width: 18, textAlign: "center", color: "var(--faint)" }}>{PICONS[t]}</span>{n}</button>
      ))}
    </>
  );
}

export function PropMenu({ dbId, propId }: { dbId: string; propId: string }) {
  const { db, mutDb } = useDb(dbId);
  const mut = useStore((s) => s.mut);
  const prop = db?.props.find((p) => p.id === propId);
  const [name, setName] = useState(prop?.name ?? "");
  const [newOpt, setNewOpt] = useState("");
  const [confirm, setConfirm] = useState(false);
  if (!prop) return null;
  const mutProp = (fn: (p: Prop) => void) => mutDb((d) => fn(d.props.find((p) => p.id === propId)!));
  return (
    <>
      <h6>{PTYPES[prop.type]}</h6>
      <div className="field">
        <input id="pname" className="inp" aria-label="Nome da propriedade" value={name} onChange={(e) => setName(e.target.value)}
          onBlur={() => mutProp((p) => { p.name = name.trim() || p.name; })} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />
      </div>
      {prop.options && <>
        <h6>Opções</h6>
        {prop.options.map((o, k) => <OptEditor key={o.id} prop={prop} opt={o} k={k} mutProp={mutProp} />)}
        <div className="field">
          <input className="inp" placeholder="Nova opção e Enter" value={newOpt} onChange={(e) => setNewOpt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || !newOpt.trim()) return;
              mutProp((p) => { p.options!.push({ id: uid(), name: newOpt.trim(), color: COLORS[(p.options!.length + 3) % COLORS.length], ...(p.type === "status" ? { group: "todo" as const } : {}) }); });
              setNewOpt("");
            }} />
        </div>
      </>}
      {prop.type !== "status" && <>
        <hr />
        {confirm
          ? <Confirm text="Os valores serão apagados." onNo={() => setConfirm(false)} onYes={() => {
              mut((w) => {
                w.dbs[dbId].props = w.dbs[dbId].props.filter((x) => x.id !== propId);
                for (const it of Object.values(w.items)) if (it.db === dbId) delete it.props[propId];
              });
              closePop();
            }} />
          : <button className="mi danger" onClick={() => setConfirm(true)}>🗑 Excluir propriedade</button>}
      </>}
    </>
  );
}

function OptEditor({ prop, opt, k, mutProp }: { prop: Prop; opt: Option; k: number; mutProp: (fn: (p: Prop) => void) => void }) {
  const [name, setName] = useState(opt.name);
  const mutOpt = (fn: (o: Option) => void) => mutProp((p) => fn(p.options!.find((o) => o.id === opt.id)!));
  return (
    <div style={{ padding: 6, borderBottom: "1px solid var(--line)", display: "grid", gap: 6 }}>
      <div style={{ display: "flex", gap: 6 }}>
        <input className="inp" aria-label="Nome da opção" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => mutOpt((o) => { o.name = name.trim() || o.name; })} />
        <button className="iconbtn" title="Subir" aria-label="Subir opção" disabled={k === 0}
          onClick={() => mutProp((p) => { const [m] = p.options!.splice(k, 1); p.options!.splice(k - 1, 0, m); })}>↑</button>
        <button className="iconbtn" title="Remover" aria-label="Remover opção" disabled={prop.type === "status" && prop.options!.length <= 1}
          onClick={() => mutProp((p) => { p.options!.splice(k, 1); })}>×</button>
      </div>
      <div className="swatches" style={{ padding: 0 }}>
        {COLORS.map((c) => <button key={c} className={"sw" + (opt.color === c ? " on" : "")} data-c={c} title={COLOR_NAMES[c]} aria-label={COLOR_NAMES[c]} onClick={() => mutOpt((o) => { o.color = c; })} />)}
      </div>
      {prop.type === "status" && (
        <select className="inp" aria-label="Significado" value={opt.group} onChange={(e) => mutOpt((o) => { o.group = e.target.value as Option["group"]; })}>
          {Object.entries(GROUPS).map(([g, n]) => <option key={g} value={g}>Significa: {n}</option>)}
        </select>
      )}
    </div>
  );
}

export function DbSettingsMenu({ dbId, anchor }: { dbId: string; anchor: HTMLElement }) {
  const { db, mutDb } = useDb(dbId);
  if (!db) return null;
  const sp = statusProp(db);
  return (
    <>
      <h6>Revisão espaçada</h6>
      <button className="mi" onClick={() => mutDb((d) => { d.srs = !d.srs; })}>
        {db.srs ? "☑" : "☐"}
        <span>Agendar revisões<div className="small muted">Ao concluir, o item volta para “Revisar” em 1, 7 e 30 dias.</div></span>
      </button>
      <hr />
      {sp && <button className="mi" onClick={() => openPop(anchor, <PropMenu dbId={dbId} propId={sp.id} />)}>◐ Editar status e cores</button>}
      <button className="mi" onClick={() => openPop(anchor, <AddPropMenu dbId={dbId} anchor={anchor} />)}>＋ Nova propriedade</button>
    </>
  );
}
