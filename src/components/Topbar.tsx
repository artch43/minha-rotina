import { pagePath } from "../lib/model";
import { go, useStore } from "../store";

export function Topbar() {
  const ws = useStore((s) => s.ws);
  const route = useStore((s) => s.ui.route);
  const setUi = useStore((s) => s.setUi);
  const path = pagePath(ws, route);
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
            <button onClick={() => go(p.id)}>
              {p.icon} {p.title || "Sem título"}
            </button>
          </span>
        ))}
      </div>
      <span className="savestate">Salvo neste navegador</span>
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
