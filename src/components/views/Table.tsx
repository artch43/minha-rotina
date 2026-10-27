import { useState } from "react";
import { visibleProps } from "../../lib/model";
import { PICONS } from "../../lib/util";
import { openPeek, openPop, setProp, useStore } from "../../store";
import { emptyText, type ViewProps } from "../DbPage";
import { AddPropMenu, PropMenu } from "../DbMenus";
import { PropDisplay, editProp } from "../Props";

export function Table({ page, db, view, list, create, hasAny }: ViewProps) {
  const props = visibleProps(db, view);
  const [live, setLive] = useState<Record<string, number>>({});
  const width = (id: string, d: number) => live[id] ?? view.widths?.[id] ?? d;
  const startResize = (id: string, e: React.MouseEvent, current: number) => {
    e.preventDefault();
    e.stopPropagation();
    const x0 = e.clientX;
    let w = current;
    const mv = (ev: MouseEvent) => {
      w = Math.max(70, current + ev.clientX - x0);
      setLive((l) => ({ ...l, [id]: w }));
    };
    const up = () => {
      removeEventListener("mousemove", mv);
      removeEventListener("mouseup", up);
      useStore.getState().mut((ws) => {
        const v = ws.dbs[page.id].views.find((x) => x.id === view.id)!;
        v.widths = { ...(v.widths || {}), [id]: w };
      });
      setLive({});
    };
    addEventListener("mousemove", mv);
    addEventListener("mouseup", up);
  };
  const th = (id: string, label: string, def: number, onClick?: (e: React.MouseEvent<HTMLTableCellElement>) => void) => (
    <th key={id} onClick={onClick}>
      {label}
      <span className="rz" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => startResize(id, e, width(id, def))} />
    </th>
  );
  return (
    <div>
      <div className="tablewrap">
        <table className="dbt">
          <colgroup>
            <col style={{ width: width("title", 280) }} />
            {props.map((p) => (
              <col key={p.id} style={{ width: width(p.id, p.type === "checkbox" ? 110 : 170) }} />
            ))}
            <col style={{ width: 44 }} />
          </colgroup>
          <thead>
            <tr>
              {th("title", "Aa  Nome", 280)}
              {props.map((p) =>
                th(p.id, PICONS[p.type] + "  " + p.name, p.type === "checkbox" ? 110 : 170, (e) =>
                  openPop(e.currentTarget, <PropMenu dbId={page.id} propId={p.id} />),
                ),
              )}
              <th
                title="Nova propriedade"
                aria-label="Nova propriedade"
                onClick={(e) => openPop(e.currentTarget, <AddPropMenu dbId={page.id} anchor={e.currentTarget} />)}
              >
                ＋
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((it) => (
              <tr key={it.id}>
                <td className="tc" onClick={() => openPeek(it.id)}>
                  {it.title || <span className="muted">Sem título</span>}
                </td>
                {props.map((p) =>
                  p.type === "checkbox" ? (
                    <td key={p.id}>
                      <input
                        type="checkbox"
                        checked={!!it.props[p.id]}
                        aria-label={p.name}
                        onChange={(e) => setProp(it.id, p.id, e.target.checked)}
                      />
                    </td>
                  ) : (
                    <td key={p.id} onClick={(e) => editProp(e.currentTarget, it.id, p.id)}>
                      <div className="tagwrap">
                        <PropDisplay prop={p} value={it.props[p.id]} item={it} db={db} />
                      </div>
                    </td>
                  ),
                )}
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="addrow" onClick={() => create()}>
        ＋ Novo
      </button>
      {!list.length && <p className="muted small">{emptyText(hasAny)}</p>}
    </div>
  );
}
