import { useCallback, useMemo, useRef, useState } from "react";
import type { Note } from "../../lib/types";
import { backlinks, extractLinks, extractTags, findByTitle, folderList, headings } from "../../lib/notes";
import { exportNoteMd, exportNotesZip, readMarkdownFiles } from "../../lib/notesIO";
import {
  addFolder,
  closePop,
  createNote,
  deleteFolder,
  deleteNote,
  openDailyNote,
  openNoteByTitle,
  openNotes,
  openPop,
  renameFolder,
  renameNote,
  toast,
  updateNote,
  usePop,
  useStore,
} from "../../store";
import { Confirm } from "../ui";
import { NoteEditor, type EditorApi } from "./NoteEditor";
import { NoteReader } from "./NoteReader";
import { Graph } from "./Graph";

const byTitle = (a: Note, b: Note) => a.title.localeCompare(b.title, "pt-BR", { numeric: true });

export default function NotesView() {
  const tab = useStore((s) => s.ui.notesTab);
  const graph = useStore((s) => s.ui.noteGraph);
  const noteId = useStore((s) => s.ui.noteId);
  const note = useStore((s) => (noteId ? s.ws.notes[noteId] : undefined));
  const setUi = useStore((s) => s.setUi);
  const editorApi = useRef<EditorApi | null>(null);
  const setTab = (t: "list" | "note" | "side") =>
    setUi((u) => {
      u.notesTab = t;
    });

  return (
    <div className="notes" data-tab={tab}>
      <div className="notes-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "list"} className={tab === "list" ? "on" : ""} onClick={() => setTab("list")}>
          Notas
        </button>
        <button role="tab" aria-selected={tab === "note"} className={tab === "note" ? "on" : ""} onClick={() => setTab("note")}>
          {graph ? "Grafo" : "Nota"}
        </button>
        <button
          role="tab"
          aria-selected={tab === "side"}
          className={tab === "side" ? "on" : ""}
          onClick={() => setTab("side")}
          disabled={!note || graph}
        >
          Conexões
        </button>
      </div>
      <NotesPanel />
      <section className="notes-center" aria-label="Nota">
        {graph ? <Graph /> : note ? <NotePane key={note.id} note={note} editorApi={editorApi} /> : <EmptyNote />}
      </section>
      <aside className="notes-side" aria-label="Conexões">
        {note && !graph && <NoteSide note={note} editorApi={editorApi} />}
      </aside>
    </div>
  );
}

/* ---------- left: folders, notes, tags ---------- */
function NotesPanel() {
  const notes = useStore((s) => s.ws.notes);
  const extra = useStore((s) => s.ws.settings.noteFolders);
  const current = useStore((s) => s.ui.noteId);
  const graph = useStore((s) => s.ui.noteGraph);
  const tag = useStore((s) => s.ui.noteTag);
  const collapsed = useStore((s) => s.ui.collapsed);
  const setUi = useStore((s) => s.setUi);
  const [q, setQ] = useState("");
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const list = Object.values(notes);
  const folders = folderList(notes, extra);
  const currentFolder = current ? (notes[current]?.folder ?? "") : "";
  const tagCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of list) for (const t of extractTags(n.body)) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [notes]);

  const query = q.trim().toLowerCase();
  const flat =
    query || tag
      ? list
          .filter(
            (n) =>
              (!query || n.title.toLowerCase().includes(query) || n.body.toLowerCase().includes(query)) &&
              (!tag || extractTags(n.body).includes(tag)),
          )
          .sort(byTitle)
      : null;

  const drop = (folder: string) => {
    if (drag && notes[drag] && notes[drag].folder !== folder) {
      updateNote(drag, { folder });
      toast(`Movida para ${folder || "Anotações"}`);
    }
    setDrag(null);
    setOver(null);
  };
  const dropProps = (folder: string) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!drag) return;
      e.preventDefault();
      if (over !== folder) setOver(folder);
    },
    onDragLeave: () => setOver((o) => (o === folder ? null : o)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      drop(folder);
    },
  });

  const noteRow = (n: Note, depth: number) => (
    <div
      key={n.id}
      className={"navrow note-row" + (n.id === current && !graph ? " on" : "")}
      style={{ paddingLeft: 8 + depth * 14 }}
      role="button"
      tabIndex={0}
      draggable
      onClick={() => openNotes(n.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter") openNotes(n.id);
      }}
      onDragStart={(e) => {
        setDrag(n.id);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", n.id);
      }}
      onDragEnd={() => {
        setDrag(null);
        setOver(null);
      }}
    >
      <span className="ic">{n.pinned ? "📌" : "📄"}</span>
      <span className="nm">{n.title || "Sem título"}</span>
    </div>
  );
  const notesIn = (folder: string) => {
    const xs = list.filter((n) => n.folder === folder).sort(byTitle);
    return folder === "Diário" || folder.startsWith("Diário/")
      ? xs.reverse()
      : xs.sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
  };
  const tree = (parent: string, depth: number): React.ReactNode[] => [
    ...folders
      .filter((f) => (parent ? f.startsWith(parent + "/") && !f.slice(parent.length + 1).includes("/") : !f.includes("/")))
      .map((f) => {
        const open = collapsed["f:" + f] !== true;
        const name = f.split("/").pop()!;
        const count = list.filter((n) => n.folder === f || n.folder.startsWith(f + "/")).length;
        return (
          <div key={"f:" + f}>
            <div
              className={"navrow folder-row" + (over === f ? " drop-in" : "")}
              style={{ paddingLeft: 4 + depth * 14 }}
              role="button"
              tabIndex={0}
              onClick={() =>
                setUi((u) => {
                  u.collapsed["f:" + f] = open;
                })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  setUi((u) => {
                    u.collapsed["f:" + f] = open;
                  });
              }}
              {...dropProps(f)}
            >
              <span className="chev" aria-hidden="true">
                {open ? "▼" : "▶"}
              </span>
              <span className="ic">📁</span>
              <span className="nm">{name}</span>
              <span className="cnt">{count}</span>
              <span className="acts">
                <button
                  className="iconbtn keep"
                  aria-label={"Opções da pasta " + name}
                  onClick={(e) => {
                    e.stopPropagation();
                    openPop(e.currentTarget, <FolderMenu path={f} />);
                  }}
                >
                  ⋯
                </button>
              </span>
            </div>
            {open && tree(f, depth + 1)}
          </div>
        );
      }),
    ...notesIn(parent).map((n) => noteRow(n, depth)),
  ];

  return (
    <aside className="notes-panel" aria-label="Anotações">
      <div className={"notes-head" + (over === "" ? " drop-in" : "")} {...dropProps("")}>
        <h2>Anotações</h2>
        <button
          className="iconbtn"
          title="Nova nota"
          aria-label="Nova nota"
          onClick={() => createNote({ folder: currentFolder })}
        >
          ＋
        </button>
        <button
          className="iconbtn"
          title="Nova pasta"
          aria-label="Nova pasta"
          onClick={(e) => openPop(e.currentTarget, <NewFolder parent={currentFolder} />)}
        >
          📁
        </button>
        <button className="iconbtn" title="Nota do dia" aria-label="Nota do dia" onClick={openDailyNote}>
          📅
        </button>
        <button
          className={"iconbtn" + (graph ? " on" : "")}
          title="Grafo"
          aria-label="Grafo"
          onClick={() => openNotes(undefined, { graph: !graph })}
        >
          ◎
        </button>
      </div>
      <div className="notes-search">
        <input
          className="inp"
          type="search"
          placeholder="Buscar nas anotações…"
          aria-label="Buscar nas anotações"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {tag && (
          <span className="fchip">
            #{tag}
            <button
              aria-label="Limpar tag"
              onClick={() =>
                setUi((u) => {
                  u.noteTag = null;
                })
              }
            >
              ×
            </button>
          </span>
        )}
      </div>
      <div className="notes-list">
        {flat ? (
          flat.length ? (
            flat.map((n) => (
              <div key={n.id}>
                {noteRow(n, 0)}
                {n.folder && <div className="note-path small muted">{n.folder}</div>}
              </div>
            ))
          ) : (
            <p className="muted small" style={{ padding: "0 10px" }}>
              Nenhuma nota encontrada.
            </p>
          )
        ) : list.length || folders.length ? (
          tree("", 0)
        ) : (
          <p className="muted small" style={{ padding: "0 10px" }}>
            Nenhuma nota ainda. Clique em ＋ para criar a primeira.
          </p>
        )}
        {tagCounts.length > 0 && !flat && (
          <>
            <div className="side-sec">Tags</div>
            <div className="tagcloud">
              {tagCounts.slice(0, 40).map(([t, n]) => (
                <button
                  key={t}
                  className="tag"
                  onClick={() =>
                    setUi((u) => {
                      u.noteTag = t;
                      u.notesTab = "list";
                    })
                  }
                >
                  #{t} <span className="cnt">{n}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="notes-foot">
        <button className="ghostbtn" onClick={() => exportNotesZip(notes)} disabled={!list.length}>
          ⬇ Exportar .zip
        </button>
        <button className="ghostbtn" onClick={() => fileInput.current?.click()}>
          ⬆ Importar .md
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".md,.markdown,.txt,text/markdown,text/plain"
          multiple
          hidden
          onChange={async (e) => {
            const files = e.target.files;
            if (!files?.length) return;
            const imported = await readMarkdownFiles(files, notes, "Importadas");
            e.target.value = "";
            if (!imported.length) {
              toast("Nenhum arquivo .md encontrado");
              return;
            }
            useStore.getState().mut((w) => {
              for (const n of imported) w.notes[n.id] = n;
            });
            openNotes(imported[0].id);
            toast(`${imported.length} ${imported.length === 1 ? "nota importada" : "notas importadas"} para “Importadas”`);
          }}
        />
      </div>
    </aside>
  );
}

function NewFolder({ parent }: { parent: string }) {
  const [name, setName] = useState("");
  const save = () => {
    if (!name.trim()) return;
    addFolder((parent ? parent + "/" : "") + name);
    closePop();
  };
  return (
    <>
      <h6>Nova pasta{parent ? ` em ${parent}` : ""}</h6>
      <div className="field">
        <input
          className="inp"
          placeholder="Nome da pasta"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
          }}
        />
        <button className="btn" onClick={save}>
          Criar
        </button>
      </div>
    </>
  );
}

function FolderMenu({ path }: { path: string }) {
  const [name, setName] = useState(path.split("/").pop()!);
  const [confirm, setConfirm] = useState(false);
  const count = useStore(
    (s) => Object.values(s.ws.notes).filter((n) => n.folder === path || n.folder.startsWith(path + "/")).length,
  );
  const parent = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
  const rename = () => {
    renameFolder(path, (parent ? parent + "/" : "") + name);
    closePop();
  };
  return (
    <>
      <button
        className="mi"
        onClick={() => {
          closePop();
          createNote({ folder: path });
        }}
      >
        ＋ Nova nota aqui
      </button>
      <button className="mi" onClick={() => openPop(usePop.getState().pop!.anchor, <NewFolder parent={path} />)}>
        📁 Nova subpasta
      </button>
      <h6>Renomear</h6>
      <div className="field">
        <input
          className="inp"
          aria-label="Nome da pasta"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") rename();
          }}
        />
      </div>
      <hr />
      {confirm ? (
        <Confirm
          text={count ? `Excluir a pasta e ${count} ${count === 1 ? "nota" : "notas"}?` : "Excluir a pasta?"}
          onYes={() => {
            closePop();
            deleteFolder(path);
          }}
          onNo={() => setConfirm(false)}
        />
      ) : (
        <button className="mi danger" onClick={() => setConfirm(true)}>
          🗑 Excluir pasta
        </button>
      )}
    </>
  );
}

/* ---------- center: the note itself ---------- */
function EmptyNote() {
  return (
    <div className="note-empty">
      <p className="muted">Escolha uma nota à esquerda ou comece uma nova.</p>
      <div className="set-actions" style={{ justifyContent: "center" }}>
        <button className="btn-primary" onClick={() => createNote()}>
          ＋ Nova nota
        </button>
        <button className="btn" onClick={openDailyNote}>
          📅 Nota do dia
        </button>
        <button className="btn" onClick={() => openNotes(undefined, { graph: true })}>
          ◎ Ver grafo
        </button>
      </div>
    </div>
  );
}

function useLinkHelpers(note: Note) {
  const setUi = useStore((s) => s.setUi);
  const titles = useCallback(
    () =>
      Object.values(useStore.getState().ws.notes)
        .filter((n) => n.id !== note.id)
        .map((n) => n.title)
        .sort(),
    [note.id],
  );
  const exists = useCallback((t: string) => !!findByTitle(useStore.getState().ws.notes, t), []);
  const open = useCallback((t: string) => openNoteByTitle(t, note.folder), [note.folder]);
  const onTag = useCallback(
    (t: string) =>
      setUi((u) => {
        u.noteTag = t;
        u.notesTab = "list";
      }),
    [],
  );
  return { titles, exists, open, onTag };
}

function NotePane({ note, editorApi }: { note: Note; editorApi: React.MutableRefObject<EditorApi | null> }) {
  const mode = useStore((s) => s.ui.noteMode);
  const notes = useStore((s) => s.ws.notes);
  const setUi = useStore((s) => s.setUi);
  const [title, setTitle] = useState(note.title);
  const { titles, exists, open, onTag } = useLinkHelpers(note);
  const dup =
    title.trim() &&
    Object.values(notes).some((n) => n.id !== note.id && n.title.trim().toLowerCase() === title.trim().toLowerCase());
  const words = note.body.trim() ? note.body.trim().split(/\s+/).length : 0;
  const commitTitle = () => {
    if (title.trim() !== note.title) renameNote(note.id, title);
  };

  return (
    <div className="note-pane">
      <div className="note-bar">
        <span className="note-crumb small muted">{note.folder ? note.folder.split("/").join(" / ") : "Anotações"}</span>
        <div className="seg" role="group" aria-label="Modo">
          <button
            className={mode === "edit" ? "on" : ""}
            aria-pressed={mode === "edit"}
            onClick={() =>
              setUi((u) => {
                u.noteMode = "edit";
              })
            }
          >
            Edição
          </button>
          <button
            className={mode === "read" ? "on" : ""}
            aria-pressed={mode === "read"}
            onClick={() =>
              setUi((u) => {
                u.noteMode = "read";
              })
            }
          >
            Leitura
          </button>
        </div>
        <button
          className="iconbtn"
          aria-label="Opções da nota"
          onClick={(e) => openPop(e.currentTarget, <NoteMenu id={note.id} />)}
        >
          ⋯
        </button>
      </div>
      <div className="note-body">
        <input
          className="note-title"
          aria-label="Título da nota"
          value={title}
          placeholder="Sem título"
          autoFocus={note.title === "Sem título" || note.title.startsWith("Sem título ")}
          onFocus={(e) => {
            if (/^Sem título( \d+)?$/.test(e.target.value)) e.target.select();
          }}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitTitle();
              setTimeout(() => editorApi.current?.focus(), 0);
            }
          }}
        />
        {dup && (
          <p className="small" style={{ color: "var(--warn)", margin: "-6px 0 8px" }}>
            Já existe outra nota com esse nome. Os links [[{title.trim()}]] vão abrir só uma delas.
          </p>
        )}
        {mode === "edit" ? (
          <NoteEditor
            noteId={note.id}
            body={note.body}
            titles={titles}
            onChange={(body) => updateNote(note.id, { body })}
            onOpenLink={open}
            onTag={onTag}
            apiRef={editorApi}
          />
        ) : (
          <NoteReader body={note.body} exists={exists} onOpenLink={open} onTag={onTag} />
        )}
        <p className="note-meta small muted">
          {words} {words === 1 ? "palavra" : "palavras"} · editada{" "}
          {new Date(note.updated).toLocaleString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

function NoteMenu({ id }: { id: string }) {
  const note = useStore((s) => s.ws.notes[id]);
  const notes = useStore((s) => s.ws.notes);
  const extra = useStore((s) => s.ws.settings.noteFolders);
  const [confirm, setConfirm] = useState(false);
  if (!note) return null;
  return (
    <>
      <button
        className="mi"
        onClick={() => {
          updateNote(id, { pinned: !note.pinned });
          closePop();
        }}
      >
        {note.pinned ? "📌 Desafixar" : "📌 Fixar no topo da pasta"}
      </button>
      <h6>Mover para</h6>
      <select
        className="inp"
        style={{ margin: "0 6px 6px", width: "calc(100% - 12px)" }}
        aria-label="Mover para pasta"
        value={note.folder}
        onChange={(e) => {
          updateNote(id, { folder: e.target.value });
          closePop();
        }}
      >
        <option value="">Anotações (raiz)</option>
        {folderList(notes, extra).map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
      <button
        className="mi"
        onClick={() => {
          exportNoteMd(note);
          closePop();
        }}
      >
        ⬇ Baixar como .md
      </button>
      <hr />
      {confirm ? (
        <Confirm
          text="Excluir esta nota?"
          onYes={() => {
            closePop();
            deleteNote(id);
          }}
          onNo={() => setConfirm(false)}
        />
      ) : (
        <button className="mi danger" onClick={() => setConfirm(true)}>
          🗑 Excluir nota
        </button>
      )}
    </>
  );
}

/* ---------- right: outline, backlinks, outgoing links, tags ---------- */
function NoteSide({ note, editorApi }: { note: Note; editorApi: React.MutableRefObject<EditorApi | null> }) {
  const notes = useStore((s) => s.ws.notes);
  const mode = useStore((s) => s.ui.noteMode);
  const setUi = useStore((s) => s.setUi);
  const outline = headings(note.body);
  const back = useMemo(() => backlinks(notes, note), [notes, note]);
  const out = extractLinks(note.body);
  const tags = extractTags(note.body);
  const goto = (i: number, line: number) => {
    setUi((u) => {
      u.notesTab = "note";
    });
    if (mode === "edit") editorApi.current?.gotoLine(line);
    else
      document.querySelectorAll(".note-read :is(h1,h2,h3,h4,h5,h6)")[i]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <div className="note-side">
      <section>
        <h3>
          Menções <span className="cnt">{back.length}</span>
        </h3>
        {back.length ? (
          back.map(({ note: n, snippet }) => (
            <button key={n.id} className="link-card" onClick={() => openNotes(n.id)}>
              <b>{n.title}</b>
              {snippet && <span className="small muted">{snippet}</span>}
            </button>
          ))
        ) : (
          <p className="small muted">Nenhuma nota aponta para esta ainda. Use [[{note.title}]] em outra nota.</p>
        )}
      </section>
      {outline.length > 0 && (
        <section>
          <h3>Sumário</h3>
          {outline.map((h, i) => (
            <button
              key={i}
              className="outline-item"
              style={{ paddingLeft: (h.level - 1) * 12 + 6 }}
              onClick={() => goto(i, h.line)}
            >
              {h.text}
            </button>
          ))}
        </section>
      )}
      {out.length > 0 && (
        <section>
          <h3>
            Links desta nota <span className="cnt">{out.length}</span>
          </h3>
          {out.map((t) => {
            const target = findByTitle(notes, t);
            return (
              <button
                key={t}
                className={"outline-item" + (target ? "" : " missing")}
                onClick={() => openNoteByTitle(t, note.folder)}
                title={target ? "Abrir" : "Criar esta nota"}
              >
                {target ? "→ " : "＋ "}
                {t}
              </button>
            );
          })}
        </section>
      )}
      {tags.length > 0 && (
        <section>
          <h3>Tags</h3>
          <div className="tagcloud">
            {tags.map((t) => (
              <button
                key={t}
                className="tag"
                onClick={() =>
                  setUi((u) => {
                    u.noteTag = t;
                    u.notesTab = "list";
                  })
                }
              >
                #{t}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
