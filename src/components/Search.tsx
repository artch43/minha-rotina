import { useState } from "react";
import { go, openPeek, useStore } from "../store";
import { Modal } from "./ui";

type Result =
  | { kind: "page"; id: string; icon: string; title: string }
  | { kind: "item"; id: string; db: string; title: string; dbTitle: string };

export function Search() {
  const ws = useStore((s) => s.ws);
  const setUi = useStore((s) => s.setUi);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const close = () =>
    setUi((u) => {
      u.modal = null;
    });
  const qq = q.trim().toLowerCase();
  const results: Result[] = [
    ...ws.pages
      .filter((p) => !qq || (p.title || "").toLowerCase().includes(qq))
      .slice(0, qq ? 20 : 8)
      .map((p) => ({ kind: "page" as const, id: p.id, icon: p.icon, title: p.title })),
    ...(qq
      ? Object.values(ws.items)
          .filter((i) => (i.title || "").toLowerCase().includes(qq))
          .slice(0, 30)
          .map((i) => ({
            kind: "item" as const,
            id: i.id,
            db: i.db,
            title: i.title,
            dbTitle: ws.pages.find((p) => p.id === i.db)?.title ?? "",
          }))
      : []),
  ];
  const s = Math.min(sel, Math.max(0, results.length - 1));
  const pick = (r: Result) => {
    close();
    if (r.kind === "page") go(r.id);
    else {
      go(r.db);
      openPeek(r.id);
    }
  };
  return (
    <Modal onClose={close}>
      <div className="modal-head">
        <span className="muted">⌕</span>
        <input
          autoFocus
          className="qsearch"
          placeholder="Buscar páginas e itens…"
          aria-label="Buscar"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setSel(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setSel(Math.min(results.length - 1, s + 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setSel(Math.max(0, s - 1));
            }
            if (e.key === "Enter" && results[s]) pick(results[s]);
          }}
        />
        <kbd>Esc</kbd>
      </div>
      <div className="modal-body" style={{ paddingTop: 6 }}>
        {results.length ? (
          results.map((r, k) => (
            <button key={r.kind + r.id} className={"mi" + (k === s ? " sel" : "")} onClick={() => pick(r)}>
              {r.kind === "page" ? (
                <>
                  {r.icon || "📄"} {r.title || "Sem título"}
                  <span className="sub">Página</span>
                </>
              ) : (
                <>
                  <span className="muted">▪</span>
                  {r.title || "Sem título"}
                  <span className="sub">{r.dbTitle}</span>
                </>
              )}
            </button>
          ))
        ) : (
          <p className="muted">Nada encontrado para “{q}”.</p>
        )}
      </div>
    </Modal>
  );
}
