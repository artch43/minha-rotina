import { useState } from "react";
import type { Page } from "../lib/types";
import { COVERS, EMOJIS } from "../lib/util";
import { closePop, openPop, useStore } from "../store";
import { BlockEditor } from "./BlockEditor";
import { DbPage } from "./DbPage";
import { DbSettingsMenu } from "./DbMenus";
import { Home } from "./Home";
import { Habits } from "./Habits";
import { Editable } from "./ui";

export function PageView() {
  const ws = useStore((s) => s.ws);
  const route = useStore((s) => s.ui.route);
  const p = ws.pages.find((x) => x.id === route) ?? ws.pages.find((x) => x.id === "home") ?? ws.pages[0];
  if (!p) return null;
  return (
    <>
      {p.cover && (
        <div className="cover" data-c={p.cover}>
          <div className="cover-acts">
            <button className="btn small" onClick={(e) => openPop(e.currentTarget, <CoverMenu id={p.id} />)}>
              Trocar capa
            </button>
          </div>
        </div>
      )}
      <div className={"page" + (p.type === "db" ? " full" : "")} key={p.id}>
        {p.type !== "home" && <PageHeader page={p} />}
        {p.type === "doc" && <DocPage id={p.id} />}
        {p.type === "db" && <DbPage page={p} />}
        {p.type === "home" && <Home />}
        {p.type === "habits" && <Habits />}
      </div>
    </>
  );
}

function PageHeader({ page: p }: { page: Page }) {
  const mut = useStore((s) => s.mut);
  const edit = (fn: (x: Page) => void) => mut((w) => fn(w.pages.find((q) => q.id === p.id)!));
  return (
    <div className="page-inner">
      <div className={"pghead" + (p.cover ? " has-cover" : "")}>
        <button
          className="pgicon"
          title="Trocar ícone"
          aria-label="Trocar ícone"
          onClick={(e) =>
            openPop(
              e.currentTarget,
              <IconMenu
                onPick={(icon) =>
                  edit((x) => {
                    x.icon = icon;
                  })
                }
              />,
            )
          }
        >
          {p.icon || "📄"}
        </button>
        <div className="pgtools">
          {!p.cover && (
            <button
              className="ghostbtn"
              onClick={() =>
                edit((x) => {
                  x.cover = "grid";
                })
              }
            >
              ▭ Adicionar capa
            </button>
          )}
          <button
            className={"ghostbtn" + (p.fav ? " on" : "")}
            onClick={() =>
              edit((x) => {
                x.fav = !x.fav;
              })
            }
          >
            {p.fav ? "★ Favorito" : "☆ Favoritar"}
          </button>
          {p.type === "db" && (
            <button
              className="ghostbtn"
              onClick={(e) => openPop(e.currentTarget, <DbSettingsMenu dbId={p.id} anchor={e.currentTarget} />)}
            >
              ⚙ Ajustes do banco
            </button>
          )}
        </div>
        {p.type !== "home" && (
          <Editable
            className="pgtitle"
            label="Título da página"
            placeholder="Sem título"
            singleLine
            autoFocus={!p.title}
            value={p.title}
            onChange={(v) =>
              edit((x) => {
                x.title = v;
              })
            }
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              const t = document.querySelector<HTMLElement>(".page .editor .txt");
              if (t) t.focus();
              else e.currentTarget.blur();
            }}
          />
        )}
      </div>
    </div>
  );
}

function DocPage({ id }: { id: string }) {
  const blocks = useStore((s) => s.ws.docs[id]) ?? [];
  const mut = useStore((s) => s.mut);
  return (
    <div className="page-inner">
      <BlockEditor
        blocks={blocks}
        onChange={(b) =>
          mut((w) => {
            w.docs[id] = b;
          })
        }
      />
    </div>
  );
}

export function IconMenu({ onPick }: { onPick: (icon: string) => void }) {
  const [custom, setCustom] = useState("");
  const pick = (i: string) => {
    onPick(i);
    closePop();
  };
  return (
    <>
      <h6>Ícone</h6>
      <div className="swatches" style={{ gap: 2 }}>
        {EMOJIS.map((em) => (
          <button key={em} className="iconbtn" style={{ fontSize: 18, width: 32, height: 32 }} onClick={() => pick(em)}>
            {em}
          </button>
        ))}
      </div>
      <div className="field">
        <input
          className="inp"
          placeholder="Ou cole um emoji e tecle Enter"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && custom.trim()) pick([...custom.trim()].slice(0, 2).join(""));
          }}
        />
      </div>
    </>
  );
}

function CoverMenu({ id }: { id: string }) {
  const p = useStore((s) => s.ws.pages.find((x) => x.id === id));
  const mut = useStore((s) => s.mut);
  const set = (c: string | null) => {
    mut((w) => {
      const x = w.pages.find((q) => q.id === id)!;
      if (c) x.cover = c;
      else delete x.cover;
    });
    closePop();
  };
  return (
    <>
      <h6>Capa</h6>
      <div className="swatches">
        {COVERS.map((c) => (
          <button
            key={c}
            className={"cover-chip cover" + (p?.cover === c ? " on" : "")}
            data-c={c}
            style={{ height: 40 }}
            aria-label={"Capa " + c}
            onClick={() => set(c)}
          />
        ))}
      </div>
      <hr />
      <button className="mi danger" onClick={() => set(null)}>
        Remover capa
      </button>
    </>
  );
}
