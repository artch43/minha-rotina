import { pagePath } from "../lib/model";
import { go, openNotes, useStore } from "../store";
import { cloudEnabled } from "../lib/supabase";
import { useSync } from "../lib/sync";

const LABELS = {
  idle: "",
  saving: "Salvando…",
  saved: "Salvo",
  offline: "Sem conexão: será salvo ao reconectar",
  error: "Não foi possível salvar. Tentando de novo…",
};

function SaveState() {
  const status = useSync((s) => s.status);
  if (!cloudEnabled) return <span className="savestate">Salvo neste navegador</span>;
  return (
    <span className={"savestate" + (status === "offline" || status === "error" ? " bad" : "")} role="status">
      {LABELS[status]}
    </span>
  );
}

export function Topbar() {
  const ws = useStore((s) => s.ws);
  const route = useStore((s) => s.ui.route);
  const setUi = useStore((s) => s.setUi);
  const noteId = useStore((s) => s.ui.noteId);
  const graph = useStore((s) => s.ui.noteGraph);
  const path =
    route === "notes"
      ? [
          { id: "notes", icon: "📓", title: "Anotações", go: () => openNotes(null) },
          ...(graph
            ? [{ id: "graph", icon: "◎", title: "Grafo", go: () => {} }]
            : noteId && ws.notes[noteId]
              ? [
                  {
                    id: noteId,
                    icon: "",
                    title: (ws.notes[noteId].folder ? ws.notes[noteId].folder + " / " : "") + ws.notes[noteId].title,
                    go: () => {},
                  },
                ]
              : []),
        ]
      : pagePath(ws, route).map((p) => ({ ...p, go: () => go(p.id) }));
  return (
    <div className="topbar">
      <button
        className="iconbtn menu-toggle"
        aria-label="Abrir páginas"
        onClick={() =>
          setUi((u) => {
            u.sideOpen = true;
          })
        }
      >
        ☰
      </button>
      <div className="crumbs">
        {path.map((p, i) => (
          <span key={p.id} style={{ display: "contents" }}>
            {i > 0 && <span className="sep">/</span>}
            <button onClick={p.go}>
              {p.icon} {p.title || "Sem título"}
            </button>
          </span>
        ))}
      </div>
      <SaveState />
      <button
        className="iconbtn"
        title="Buscar"
        aria-label="Buscar"
        onClick={() =>
          setUi((u) => {
            u.modal = "search";
          })
        }
      >
        ⌕
      </button>
    </div>
  );
}
