import type { Page, View } from "../lib/types";
import { applyFilters, defaultsFromFilters, filterLabel } from "../lib/model";
import { newItem, openPeek, openPop, useStore } from "../store";
import { AddViewMenu, FilterMenu, PropsMenu, SortMenu, ViewMenu } from "./DbMenus";
import { Board } from "./views/Board";
import { Table } from "./views/Table";
import { ListView } from "./views/ListView";
import { Calendar } from "./views/Calendar";

const ICONS = { board: "▥", table: "▦", list: "☰", calendar: "◷" };

export function DbPage({ page }: { page: Page }) {
  const ws = useStore((s) => s.ws);
  const viewId = useStore((s) => s.ui.viewByDb[page.id]);
  const search = useStore((s) => s.ui.search[page.id]) ?? "";
  const { setUi, mut } = useStore.getState();
  const db = ws.dbs[page.id];
  if (!db) return <div className="empty">Este banco de dados não foi encontrado.</div>;
  const view = db.views.find((v) => v.id === viewId) ?? db.views[0];
  const list = applyFilters(ws, page.id, view, search);
  const hasAny = Object.values(ws.items).some((i) => i.db === page.id);
  const mutView = (fn: (v: View) => void) => mut((w) => fn(w.dbs[page.id].views.find((x) => x.id === view.id)!));
  const create = (props = {}) => openPeek(newItem(page.id, { ...defaultsFromFilters(db, view), ...props }), true);
  const sortName = view.sort?.prop === "title" ? "Nome" : view.sort?.prop === "created" ? "Criação" : db.props.find((x) => x.id === view.sort?.prop)?.name;
  const props = { page, db, view, list, create, hasAny };

  return (
    <div>
      <div className="page-inner">
        <div className="dbbar">
          <div className="vtabs" role="tablist">
            {db.views.map((v) => (
              <button key={v.id} role="tab" aria-selected={v.id === view.id} className={"vtab" + (v.id === view.id ? " on" : "")}
                onClick={(e) => { if (v.id === view.id) openPop(e.currentTarget, <ViewMenu dbId={page.id} viewId={v.id} />); else setUi((u) => { u.viewByDb[page.id] = v.id; }); }}>
                {ICONS[v.type]} {v.name}
              </button>
            ))}
            <button className="vtab" title="Nova visão" aria-label="Nova visão" onClick={(e) => openPop(e.currentTarget, <AddViewMenu dbId={page.id} />)}>＋</button>
          </div>
          <div className="dbtools">
            <button className={"ghostbtn" + (view.filters.length ? " act" : "")} onClick={(e) => openPop(e.currentTarget, <FilterMenu dbId={page.id} viewId={view.id} />)}>⛃ Filtro</button>
            <button className={"ghostbtn" + (view.sort?.prop ? " act" : "")} onClick={(e) => openPop(e.currentTarget, <SortMenu dbId={page.id} viewId={view.id} />)}>⇅ Ordenar</button>
            <button className="ghostbtn" onClick={(e) => openPop(e.currentTarget, <PropsMenu dbId={page.id} viewId={view.id} anchor={e.currentTarget} />)}>◫ Propriedades</button>
            <input className="dbsearch" type="search" placeholder="Buscar…" aria-label="Buscar neste banco" value={search}
              onChange={(e) => { const v = e.target.value; setUi((u) => { u.search[page.id] = v; }); }} />
            <button className="btn-primary" onClick={() => create()}>＋ Novo</button>
          </div>
        </div>
        {(view.filters.length > 0 || view.sort?.prop) && (
          <div className="chips">
            {view.filters.map((f, k) => (
              <span className="fchip" key={k}>{filterLabel(db, f)}
                <button aria-label="Remover filtro" onClick={() => mutView((v) => { v.filters.splice(k, 1); })}>×</button>
              </span>
            ))}
            {view.sort?.prop && (
              <span className="fchip">Ordem: {sortName} {view.sort.dir === "desc" ? "↓" : "↑"}
                <button aria-label="Remover ordenação" onClick={() => mutView((v) => { v.sort = null; })}>×</button>
              </span>
            )}
          </div>
        )}
      </div>
      {view.type === "board" ? <Board {...props} /> : (
        <div className="page-inner">
          {view.type === "table" && <Table {...props} />}
          {view.type === "list" && <ListView {...props} />}
          {view.type === "calendar" && <Calendar {...props} />}
        </div>
      )}
    </div>
  );
}

export interface ViewProps {
  page: Page; db: import("../lib/types").Database; view: View; list: import("../lib/types").Item[];
  create: (props?: Record<string, import("../lib/types").PropValue>) => void; hasAny: boolean;
}
export const emptyText = (hasAny: boolean) => hasAny ? "Nenhum item corresponde aos filtros." : "Nenhum item ainda. Clique em “＋ Novo” para criar o primeiro.";
