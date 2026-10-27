import { useState } from "react";
import type { Item } from "../../lib/types";
import { groupOf, optOf, statusProp, visibleProps } from "../../lib/model";
import { fmtDate } from "../../lib/util";
import { openPeek, patchItem, setProp, useStore } from "../../store";
import type { ViewProps } from "../DbPage";
import { PropDisplay, editProp } from "../Props";
import { Tag } from "../ui";

export function Board({ page, db, view, list, create }: ViewProps) {
  const sp = statusProp(db)!;
  const [drag, setDrag] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ col: string; index: number } | null>(null);
  const cols = sp.options!.map((o) => ({ o, items: list.filter((i) => i.props[sp.id] === o.id) }));
  const orphans = list.filter((i) => !optOf(sp, i.props[sp.id]));
  const shown = visibleProps(db, view).filter((p) => p.type !== "status");

  const onDrop = (colId: string) => {
    if (!drag || !drop) return;
    const ids = list.filter((i) => i.props[sp.id] === colId && i.id !== drag).map((i) => i.id);
    const items = useStore.getState().ws.items;
    const prev = items[ids[drop.index - 1]], next = items[ids[drop.index]];
    const order = prev && next ? (prev.order + next.order) / 2 : prev ? prev.order + 1 : next ? next.order - 1 : Date.now();
    if (view.sort?.prop) useStore.getState().mut((w) => { w.dbs[page.id].views.find((v) => v.id === view.id)!.sort = null; });
    patchItem(drag, (it) => { it.order = order; });
    if (useStore.getState().ws.items[drag]?.props[sp.id] !== colId) setProp(drag, sp.id, colId);
  };

  const card = (it: Item) => {
    const extra = db.srs && it.review?.next && groupOf(db, it) === "done";
    return (
      <div key={it.id} data-id={it.id} className={"card" + (drag === it.id ? " dragging" : "")} draggable tabIndex={0} role="button"
        onClick={() => openPeek(it.id)} onKeyDown={(e) => { if (e.key === "Enter") openPeek(it.id); }}
        onDragStart={(e) => { setDrag(it.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", it.id); }}
        onDragEnd={() => { setDrag(null); setDrop(null); }}>
        <div className="ttl">{it.title || <span className="muted">Sem título</span>}</div>
        <button className="iconbtn mv" title="Mudar status" aria-label="Mudar status" onClick={(e) => { e.stopPropagation(); editProp(e.currentTarget, it.id, sp.id); }}>⇄</button>
        <div className="props">
          {shown.map((p) => <PropDisplay key={p.id} prop={p} value={it.props[p.id]} item={it} db={db} />)}
          {extra && <span className="review-chip">↻ revisão {fmtDate(it.review!.next!).toLowerCase()}</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="board" style={{ paddingLeft: "max(0px, calc((100% - var(--page-w)) / 2))" }}>
      {orphans.length > 0 && (
        <div className="col">
          <div className="colhead"><span className="tag">Sem status</span><span className="cnt">{orphans.length}</span></div>
          <div className="cards">{orphans.map(card)}</div>
        </div>
      )}
      {cols.map(({ o, items }) => {
        const visible = items.filter((i) => i.id !== drag);
        const nodes = visible.map(card);
        if (drop?.col === o.id) nodes.splice(drop.index, 0, <div key="__drop" className="drop-line" />);
        if (drag && items.some((i) => i.id === drag)) nodes.push(card(items.find((i) => i.id === drag)!));
        return (
          <div key={o.id} className={"col" + (drop?.col === o.id ? " dragover" : "")}
            onDragOver={(e) => {
              if (!drag) return;
              e.preventDefault();
              const els = [...e.currentTarget.querySelectorAll<HTMLElement>(".card:not(.dragging)")];
              let index = els.findIndex((el) => e.clientY < el.getBoundingClientRect().top + el.offsetHeight / 2);
              if (index < 0) index = els.length;
              if (drop?.col !== o.id || drop.index !== index) setDrop({ col: o.id, index });
            }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrop((d) => (d?.col === o.id ? null : d)); }}
            onDrop={(e) => { e.preventDefault(); onDrop(o.id); setDrag(null); setDrop(null); }}>
            <div className="colhead">
              <Tag opt={o} status /><span className="cnt">{items.length}</span>
              <button className="iconbtn" title="Novo item nesta coluna" aria-label={"Novo item em " + o.name} onClick={() => create({ [sp.id]: o.id })}>＋</button>
            </div>
            <div className="cards">{nodes}</div>
            <button className="addrow" onClick={() => create({ [sp.id]: o.id })}>＋ Novo</button>
          </div>
        );
      })}
    </div>
  );
}
