import { useEffect, useRef, useState } from "react";
import { groupOf, optOf, statusProp } from "../lib/model";
import { INTERVALS, PICONS, fmtDate } from "../lib/util";
import { closePeek, deleteItem, patchItem, useStore } from "../store";
import { BlockEditor } from "./BlockEditor";
import { PropDisplay, editProp } from "./Props";
import { Confirm, Editable } from "./ui";

export function Peek() {
  const id = useStore((s) => s.ui.peek);
  const it = useStore((s) => (id ? s.ws.items[id] : undefined));
  const db = useStore((s) => (it ? s.ws.dbs[it.db] : undefined));
  const page = useStore((s) => (it ? s.ws.pages.find((p) => p.id === it.db) : undefined));
  const focus = useStore((s) => s.ui.peekFocus);
  const setUi = useStore((s) => s.setUi);
  const [confirm, setConfirm] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focus) return;
    setUi((u) => { u.peekFocus = false; });
    setTimeout(() => panel.current?.querySelector<HTMLElement>(".pgtitle")?.focus(), 30);
  }, [focus, id]);
  useEffect(() => setConfirm(false), [id]);

  if (!it || !db) return null;
  const sp = statusProp(db);
  const g = groupOf(db, it);
  const r = it.review;

  return (
    <>
      <div className="scrim" onClick={closePeek} />
      <div className="peek" role="dialog" aria-label={it.title || "Item"} ref={panel}>
        <div className="peek-top">
          <button className="iconbtn" aria-label="Fechar" title="Fechar (Esc)" onClick={closePeek}>✕</button>
          <span className="crumb">{page ? `${page.icon} ${page.title || "Sem título"}` : ""}</span>
          <button className="ghostbtn" onClick={() => setConfirm(true)}>🗑 Excluir</button>
        </div>
        <div className="peek-body">
          {confirm && <Confirm text="Excluir este item?" onYes={() => deleteItem(it.id)} onNo={() => setConfirm(false)} />}
          <Editable className="pgtitle" label="Título do item" placeholder="Sem título" singleLine value={it.title}
            onChange={(v) => patchItem(it.id, (x) => { x.title = v; })}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); panel.current?.querySelector<HTMLElement>(".editor .txt")?.focus(); } }} />
          <div className="props-grid">
            {db.props.map((p) => {
              const v = it.props[p.id];
              return (
                <div key={p.id} style={{ display: "contents" }}>
                  <div className="pl"><span style={{ color: "var(--faint)", width: 16, textAlign: "center" }}>{PICONS[p.type]}</span>{p.name}</div>
                  <div className="pv" role="button" tabIndex={0} onClick={(e) => editProp(e.currentTarget, it.id, p.id)} onKeyDown={(e) => { if (e.key === "Enter") editProp(e.currentTarget, it.id, p.id); }}>
                    {p.type === "checkbox" ? <span>{v ? "☑ Sim" : "☐ Não"}</span>
                      : (v == null || v === "" || (Array.isArray(v) && !v.length)) ? <span className="ph">Vazio</span>
                      : <PropDisplay prop={p} value={v} item={it} db={db} />}
                  </div>
                </div>
              );
            })}
          </div>
          {db.srs && r && (
            <div className="srsbox">
              <span className="dots" aria-hidden="true">
                {INTERVALS.map((_, k) => <i key={k} className={k < r.stage || (k === r.stage && g === "review") || r.finished ? "f" : ""} />)}
              </span>
              <span>
                {r.finished ? "Ciclo de revisões concluído."
                  : g === "review" ? `Hora de revisar! Ao terminar, mude para “${optOf(sp, sp?.options?.find((o) => o.group === "done")?.id)?.name ?? "concluído"}”.`
                  : `Próxima revisão: ${fmtDate(r.next!).toLowerCase()} (${INTERVALS[r.stage]} ${INTERVALS[r.stage] === 1 ? "dia" : "dias"} depois).`}
              </span>
              <button className="ghostbtn" style={{ marginLeft: "auto" }} onClick={() => patchItem(it.id, (x) => { delete x.review; })}>Parar</button>
            </div>
          )}
          <hr className="sep" />
          <BlockEditor key={it.id} blocks={it.blocks} onChange={(b) => patchItem(it.id, (x) => { x.blocks = b; })} placeholder="Anotações, resumo, links… (digite / para blocos)" />
        </div>
      </div>
    </>
  );
}
