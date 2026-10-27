import { Fragment, useState } from "react";
import type { Page } from "../lib/types";
import { childrenOf, descendants } from "../lib/model";
import { addPage, closePop, deletePage, go, movePage, openDailyNote, openNotes, openPop, useStore } from "../store";
import { Confirm } from "./ui";
import { cloudEnabled } from "../lib/supabase";

type DropMode = "before" | "after" | "in";

export function Sidebar() {
  const ws = useStore((s) => s.ws);
  const route = useStore((s) => s.ui.route);
  const collapsed = useStore((s) => s.ui.collapsed);
  const setUi = useStore((s) => s.setUi);
  const [drag, setDrag] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ id: string; mode: DropMode } | null>(null);
  const favs = ws.pages.filter((p) => p.fav);

  const row = (p: Page, depth: number, inFav: boolean) => {
    const open = collapsed[p.id] === false;
    const canNest = p.type === "doc" || p.type === "db" || childrenOf(ws, p.id).length > 0;
    const dropCls = !inFav && drop?.id === p.id ? " drop-" + drop.mode : "";
    return (
      <div
        className={"navrow" + (route === p.id ? " on" : "") + dropCls}
        style={{ paddingLeft: 4 + depth * 14 }}
        draggable={!inFav}
        role="button"
        tabIndex={0}
        onClick={() => go(p.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter") go(p.id);
        }}
        onDragStart={(e) => {
          setDrag(p.id);
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", p.id);
        }}
        onDragEnd={() => {
          setDrag(null);
          setDrop(null);
        }}
        onDragOver={(e) => {
          if (inFav || !drag || drag === p.id || descendants(ws, drag).includes(p.id)) return;
          e.preventDefault();
          const r = e.currentTarget.getBoundingClientRect(),
            y = (e.clientY - r.top) / r.height;
          const mode: DropMode = y < 0.28 ? "before" : y > 0.72 ? "after" : "in";
          if (drop?.id !== p.id || drop.mode !== mode) setDrop({ id: p.id, mode });
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (drag && drop) movePage(drag, drop.id, drop.mode);
          setDrag(null);
          setDrop(null);
        }}
      >
        <button
          className="chev"
          style={{ visibility: canNest ? "visible" : "hidden" }}
          aria-label={open ? "Recolher" : "Expandir"}
          onClick={(e) => {
            e.stopPropagation();
            setUi((u) => {
              u.collapsed[p.id] = !open ? false : true;
            });
          }}
        >
          {open ? "▼" : "▶"}
        </button>
        <span className="ic">{p.icon || "📄"}</span>
        <span className="nm">{p.title || "Sem título"}</span>
        <span className="acts">
          <button
            className="iconbtn keep"
            title="Opções"
            aria-label="Opções da página"
            onClick={(e) => {
              e.stopPropagation();
              openPop(e.currentTarget, <PageMenu id={p.id} />);
            }}
          >
            ⋯
          </button>
          {!inFav && (
            <button
              className="iconbtn"
              title="Adicionar subpágina"
              aria-label="Adicionar subpágina"
              onClick={(e) => {
                e.stopPropagation();
                openPop(e.currentTarget, <NewPageMenu parent={p.id} />);
              }}
            >
              ＋
            </button>
          )}
        </span>
      </div>
    );
  };
  const tree = (pid: string | null, depth: number): JSX.Element[] =>
    childrenOf(ws, pid).map((p) => (
      <Fragment key={p.id}>
        {row(p, depth, false)}
        {collapsed[p.id] === false && tree(p.id, depth + 1)}
      </Fragment>
    ));

  return (
    <>
      <div className="side-top">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          {ws.settings.name ? "Rotina de " + ws.settings.name : "Minha Rotina"}
        </div>
        <button
          className="iconbtn"
          title="Nova página"
          aria-label="Nova página"
          onClick={(e) => openPop(e.currentTarget, <NewPageMenu parent={null} />)}
        >
          ＋
        </button>
      </div>
      <div style={{ padding: "0 8px" }}>
        <button
          className="searchbtn"
          onClick={() =>
            setUi((u) => {
              u.modal = "search";
              u.sideOpen = false;
            })
          }
        >
          ⌕&nbsp; Buscar <kbd>⌘K</kbd>
        </button>
      </div>
      <div className="side-scroll">
        {favs.length > 0 && (
          <>
            <div className="side-sec">Favoritos</div>
            {favs.map((p) => (
              <Fragment key={p.id}>{row(p, 0, true)}</Fragment>
            ))}
          </>
        )}
        <div className="side-sec">Espaços</div>
        <div
          className={"navrow" + (route === "notes" ? " on" : "")}
          role="button"
          tabIndex={0}
          onClick={() => openNotes()}
          onKeyDown={(e) => {
            if (e.key === "Enter") openNotes();
          }}
        >
          <span className="chev" style={{ visibility: "hidden" }} />
          <span className="ic">📓</span>
          <span className="nm">Anotações</span>
          <span className="acts">
            <button
              className="iconbtn keep"
              title="Nota do dia"
              aria-label="Nota do dia"
              onClick={(e) => {
                e.stopPropagation();
                openDailyNote();
              }}
            >
              📅
            </button>
          </span>
        </div>
        <div className="side-sec">Páginas</div>
        {tree(null, 0)}
      </div>
      <div className="side-bottom">
        {cloudEnabled && (
          <button
            className="searchbtn"
            onClick={() =>
              setUi((u) => {
                u.modal = "trash";
                u.sideOpen = false;
              })
            }
          >
            🗑&nbsp; Lixeira
          </button>
        )}
        <button
          className="searchbtn"
          onClick={() =>
            setUi((u) => {
              u.modal = "settings";
              u.sideOpen = false;
            })
          }
        >
          ⚙&nbsp; Configurações
        </button>
      </div>
    </>
  );
}

export function NewPageMenu({ parent }: { parent: string | null }) {
  return (
    <>
      <h6>Nova página</h6>
      <button
        className="mi"
        onClick={() => {
          closePop();
          addPage("doc", parent);
        }}
      >
        📝 <span>Página de texto</span>
      </button>
      <button
        className="mi"
        onClick={() => {
          closePop();
          addPage("db", parent);
        }}
      >
        🗂️{" "}
        <span>
          Banco de dados<div className="small muted">Quadro com status, tabela, lista e calendário</div>
        </span>
      </button>
    </>
  );
}

function PageMenu({ id }: { id: string }) {
  const p = useStore((s) => s.ws.pages.find((x) => x.id === id));
  const mut = useStore((s) => s.mut);
  const [confirm, setConfirm] = useState(false);
  if (!p) return null;
  const fixed = p.type === "home" || p.type === "habits";
  return (
    <>
      <button
        className="mi"
        onClick={() => {
          mut((w) => {
            const x = w.pages.find((q) => q.id === id)!;
            x.fav = !x.fav;
          });
          closePop();
        }}
      >
        {p.fav ? "★ Remover dos favoritos" : "☆ Adicionar aos favoritos"}
      </button>
      {!fixed && (
        <button
          className="mi"
          onClick={() => {
            closePop();
            go(id);
            setTimeout(() => (document.querySelector(".page .pgtitle") as HTMLElement | null)?.focus(), 50);
          }}
        >
          ✎ Renomear
        </button>
      )}
      {!fixed && (
        <>
          <hr />
          {confirm ? (
            <Confirm
              text="Excluir com subpáginas e itens?"
              onYes={() => {
                closePop();
                deletePage(id);
              }}
              onNo={() => setConfirm(false)}
            />
          ) : (
            <button className="mi danger" onClick={() => setConfirm(true)}>
              🗑 Excluir
            </button>
          )}
        </>
      )}
    </>
  );
}
