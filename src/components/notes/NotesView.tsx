import { useCallback, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Download,
  FilePlus2,
  FileText,
  Folder,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Pin,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Note } from "@/lib/types";
import { backlinks, extractLinks, extractTags, findByTitle, folderList, headings } from "@/lib/notes";
import { exportNoteMd, exportNotesZip, readMarkdownFiles } from "@/lib/notesIO";
import {
  addFolder,
  createNote,
  deleteFolder,
  deleteNote,
  openDailyNote,
  openNoteByTitle,
  openNotes,
  renameFolder,
  renameNote,
  toast,
  updateNote,
  useStore,
} from "@/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NoteEditor, type EditorApi } from "./NoteEditor";
import { NoteReader } from "./NoteReader";

const byTitle = (a: Note, b: Note) => a.title.localeCompare(b.title, "pt-BR", { numeric: true });

export default function NotesView() {
  const tab = useStore((s) => s.ui.notesTab);
  const noteId = useStore((s) => s.ui.noteId);
  const note = useStore((s) => (noteId ? s.ws.notes[noteId] : undefined));
  const setUi = useStore((s) => s.setUi);
  const editorApi = useRef<EditorApi | null>(null);
  const hideOnPhone = (t: string) => (tab !== t ? "max-md:hidden" : "");
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b px-4 py-2 md:hidden">
        <Tabs
          value={tab}
          onValueChange={(v) =>
            setUi((u) => {
              u.notesTab = v as typeof u.notesTab;
            })
          }
        >
          <TabsList className="w-full">
            <TabsTrigger value="list">Notas</TabsTrigger>
            <TabsTrigger value="note">Nota</TabsTrigger>
            <TabsTrigger value="side" disabled={!note}>
              Conexões
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_17rem]">
        <aside className={cn("flex min-h-0 flex-col border-r bg-sidebar/50", hideOnPhone("list"))}>
          <NotesPanel />
        </aside>
        <section className={cn("min-h-0 overflow-y-auto", hideOnPhone("note"))} aria-label="Nota">
          {note ? <NotePane key={note.id} note={note} editorApi={editorApi} /> : <EmptyNote />}
        </section>
        <aside className={cn("min-h-0 overflow-y-auto border-l", tab === "side" ? "max-xl:md:hidden" : "max-xl:hidden")}>
          {note && <NoteSide note={note} editorApi={editorApi} />}
        </aside>
      </div>
    </div>
  );
}

/* ---------- left: folders, notes, tags ---------- */
function NotesPanel() {
  const notes = useStore((s) => s.ws.notes);
  const extra = useStore((s) => s.ws.settings.noteFolders);
  const current = useStore((s) => s.ui.noteId);
  const tag = useStore((s) => s.ui.noteTag);
  const setUi = useStore((s) => s.setUi);
  const [q, setQ] = useState("");
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [folderDialog, setFolderDialog] = useState<{ mode: "new" | "rename"; path: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const list = Object.values(notes);
  const folders = folderList(notes, extra);
  const currentFolder = current ? (notes[current]?.folder ?? "") : "";
  const tagCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of Object.values(notes)) for (const t of extractTags(n.body)) m.set(t, (m.get(t) ?? 0) + 1);
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

  const dropProps = (folder: string) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!drag) return;
      e.preventDefault();
      if (over !== folder) setOver(folder);
    },
    onDragLeave: () => setOver((o) => (o === folder ? null : o)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      if (drag && notes[drag] && notes[drag].folder !== folder) {
        updateNote(drag, { folder });
        toast(`Movida para ${folder || "Anotações"}`);
      }
      setDrag(null);
      setOver(null);
    },
  });
  const noteRow = (n: Note, depth: number) => (
    <button
      key={n.id}
      draggable
      style={{ paddingLeft: 10 + depth * 14 }}
      onClick={() => openNotes(n.id)}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", n.id);
        requestAnimationFrame(() => setDrag(n.id));
      }}
      onDragEnd={() => {
        setDrag(null);
        setOver(null);
      }}
      className={cn(
        "flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-left text-sm hover:bg-sidebar-accent",
        n.id === current && "bg-sidebar-accent font-medium",
      )}
    >
      {n.pinned ? (
        <Pin className="size-3.5 shrink-0 text-muted-foreground" />
      ) : (
        <FileText className="size-3.5 shrink-0 text-muted-foreground" />
      )}
      <span className="truncate">{n.title || "Sem título"}</span>
    </button>
  );
  const notesIn = (folder: string) => {
    const xs = list.filter((n) => n.folder === folder).sort(byTitle);
    return folder.startsWith("Diário") ? xs.reverse() : xs.sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
  };
  const tree = (parent: string, depth: number): React.ReactNode[] => [
    ...folders
      .filter((f) => (parent ? f.startsWith(parent + "/") && !f.slice(parent.length + 1).includes("/") : !f.includes("/")))
      .map((f) => {
        const open = !closed[f];
        const name = f.split("/").pop()!;
        return (
          <div key={"f:" + f}>
            <div
              className={cn("group flex items-center rounded-md hover:bg-sidebar-accent", over === f && "ring-2 ring-primary")}
              style={{ paddingLeft: 2 + depth * 14 }}
              {...dropProps(f)}
            >
              <button
                className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left text-sm"
                onClick={() => setClosed((c) => ({ ...c, [f]: open }))}
                aria-expanded={open}
              >
                {open ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
                <Folder className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{name}</span>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Opções da pasta ${name}`}
                    className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
                  >
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={() => createNote({ folder: f })}>
                      <FilePlus2 />
                      Nova nota aqui
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setFolderDialog({ mode: "new", path: f })}>
                      <FolderPlus />
                      Nova subpasta
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setFolderDialog({ mode: "rename", path: f })}>
                      <Pencil />
                      Renomear
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => deleteFolder(f)}>
                    <Trash2 />
                    Excluir pasta
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {open && tree(f, depth + 1)}
          </div>
        );
      }),
    ...notesIn(parent).map((n) => noteRow(n, depth)),
  ];

  return (
    <>
      <div
        className={cn("flex items-center gap-1 px-3 pt-3 pb-2", over === "" && "rounded-md ring-2 ring-primary")}
        {...dropProps("")}
      >
        <h2 className="mr-auto text-sm font-semibold">Anotações</h2>
        <Button
          variant="ghost"
          size="icon-sm"
          title="Nova nota"
          aria-label="Nova nota"
          onClick={() => createNote({ folder: currentFolder })}
        >
          <FilePlus2 />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          title="Nova pasta"
          aria-label="Nova pasta"
          onClick={() => setFolderDialog({ mode: "new", path: currentFolder })}
        >
          <FolderPlus />
        </Button>
        <Button variant="ghost" size="icon-sm" title="Nota do dia" aria-label="Nota do dia" onClick={openDailyNote}>
          <CalendarDays />
        </Button>
      </div>
      <div className="flex flex-col gap-2 px-3 pb-2">
        <InputGroup>
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            placeholder="Buscar nas notas…"
            aria-label="Buscar nas anotações"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </InputGroup>
        {tag && (
          <Badge variant="secondary" className="w-fit gap-1 pr-1">
            #{tag}
            <button
              aria-label="Limpar tag"
              className="rounded-full p-0.5 hover:bg-background"
              onClick={() =>
                setUi((u) => {
                  u.noteTag = null;
                })
              }
            >
              <X className="size-3" />
            </button>
          </Badge>
        )}
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-3" aria-label="Lista de notas">
        {flat ? (
          flat.length ? (
            flat.map((n) => noteRow(n, 0))
          ) : (
            <p className="px-2 text-sm text-muted-foreground">Nenhuma nota encontrada.</p>
          )
        ) : list.length || folders.length ? (
          tree("", 0)
        ) : (
          <p className="px-2 text-sm text-muted-foreground">Nenhuma nota ainda. Crie a primeira no botão acima.</p>
        )}
        {tagCounts.length > 0 && !flat && (
          <div className="mt-4 flex flex-col gap-2 px-1">
            <span className="text-xs font-medium text-muted-foreground">Tags</span>
            <div className="flex flex-wrap gap-1">
              {tagCounts.slice(0, 30).map(([t, n]) => (
                <button
                  key={t}
                  onClick={() =>
                    setUi((u) => {
                      u.noteTag = t;
                    })
                  }
                >
                  <Badge variant="outline">
                    #{t} <span className="text-muted-foreground">{n}</span>
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>
      <div className="flex flex-wrap gap-1 border-t p-2">
        <Button variant="ghost" size="sm" disabled={!list.length} onClick={() => exportNotesZip(notes)}>
          <Download data-icon="inline-start" />
          Exportar .zip
        </Button>
        <Button variant="ghost" size="sm" onClick={() => fileInput.current?.click()}>
          <Upload data-icon="inline-start" />
          Importar .md
        </Button>
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
            if (!imported.length) return toast("Nenhum arquivo .md encontrado");
            useStore.getState().mut((w) => {
              for (const n of imported) w.notes[n.id] = n;
            });
            openNotes(imported[0].id);
            toast(`${imported.length} ${imported.length === 1 ? "nota importada" : "notas importadas"} para “Importadas”`);
          }}
        />
      </div>
      {folderDialog && <FolderDialog {...folderDialog} onClose={() => setFolderDialog(null)} />}
    </>
  );
}

function FolderDialog({ mode, path, onClose }: { mode: "new" | "rename"; path: string; onClose: () => void }) {
  const [name, setName] = useState(mode === "rename" ? path.split("/").pop()! : "");
  const parent = mode === "rename" ? (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "") : path;
  const save = () => {
    if (!name.trim()) return;
    const full = (parent ? parent + "/" : "") + name.trim();
    if (mode === "new") addFolder(full);
    else renameFolder(path, full);
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === "new" ? (parent ? `Nova pasta em ${parent}` : "Nova pasta") : "Renomear pasta"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="flex flex-col gap-4"
        >
          <Input
            autoFocus
            aria-label="Nome da pasta"
            placeholder="Nome da pasta"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              {mode === "new" ? "Criar pasta" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- center: the note ---------- */
function EmptyNote() {
  return (
    <Empty className="h-full">
      <EmptyHeader>
        <EmptyTitle>Nenhuma nota aberta</EmptyTitle>
        <EmptyDescription>Escolha uma nota à esquerda ou comece uma nova. Use [[Nome]] para ligar notas.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center">
        <Button onClick={() => createNote()}>
          <FilePlus2 data-icon="inline-start" />
          Nova nota
        </Button>
        <Button variant="outline" onClick={openDailyNote}>
          <CalendarDays data-icon="inline-start" />
          Nota do dia
        </Button>
      </EmptyContent>
    </Empty>
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
  const extra = useStore((s) => s.ws.settings.noteFolders);
  const setUi = useStore((s) => s.setUi);
  const [title, setTitle] = useState(note.title);
  const { titles, exists, open, onTag } = useLinkHelpers(note);
  const dup =
    title.trim() &&
    Object.values(notes).some((n) => n.id !== note.id && n.title.trim().toLowerCase() === title.trim().toLowerCase());
  const words = note.body.trim() ? note.body.trim().split(/\s+/).length : 0;
  const commit = () => {
    if (title.trim() !== note.title) renameNote(note.id, title);
  };
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-5 md:px-10">
      <div className="sticky top-0 z-[1] flex items-center gap-2 bg-background py-3">
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          {note.folder ? note.folder.split("/").join(" / ") : "Anotações"}
        </span>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={mode}
          onValueChange={(v) =>
            v &&
            setUi((u) => {
              u.noteMode = v as "edit" | "read";
            })
          }
          aria-label="Modo"
        >
          <ToggleGroupItem value="edit" className="px-3">
            Editar
          </ToggleGroupItem>
          <ToggleGroupItem value="read" className="px-3">
            Ler
          </ToggleGroupItem>
        </ToggleGroup>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Opções da nota">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={() => updateNote(note.id, { pinned: !note.pinned })}>
                <Pin />
                {note.pinned ? "Desafixar" : "Fixar no topo da pasta"}
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Folder />
                  Mover para
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuLabel>Pasta</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={note.folder} onValueChange={(f) => updateNote(note.id, { folder: f })}>
                    <DropdownMenuRadioItem value="">Anotações (início)</DropdownMenuRadioItem>
                    {folderList(notes, extra).map((f) => (
                      <DropdownMenuRadioItem key={f} value={f}>
                        {f}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem onSelect={() => exportNoteMd(note)}>
                <Download />
                Baixar como .md
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => deleteNote(note.id)}>
              <Trash2 />
              Excluir nota
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <input
        aria-label="Título da nota"
        value={title}
        placeholder="Sem título"
        autoFocus={/^Sem título( \d+)?$/.test(note.title)}
        onFocus={(e) => {
          if (/^Sem título( \d+)?$/.test(e.target.value)) e.target.select();
        }}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
            setTimeout(() => editorApi.current?.focus(), 0);
          }
        }}
        className="w-full bg-transparent pt-2 pb-3 text-3xl font-bold tracking-tight outline-none placeholder:text-muted-foreground md:text-4xl"
      />
      {dup && (
        <p className="-mt-1 mb-2 text-sm text-warning">
          Já existe outra nota com esse nome. Links [[{title.trim()}]] vão abrir só uma delas.
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
      <p className="border-t py-3 text-xs text-muted-foreground">
        {words} {words === 1 ? "palavra" : "palavras"}, editada em{" "}
        {new Date(note.updated).toLocaleString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
      </p>
    </div>
  );
}

/* ---------- right: backlinks, outline, outgoing links, tags ---------- */
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
  const section = (title: string, children: React.ReactNode, count?: number) => (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-sm font-semibold">
        {title}
        {count !== undefined && <span className="ml-1.5 font-normal text-muted-foreground tabular-nums">{count}</span>}
      </h3>
      {children}
    </section>
  );
  return (
    <div className="flex flex-col gap-6 p-4">
      {section(
        "Menções",
        back.length ? (
          back.map(({ note: n, snippet }) => (
            <button
              key={n.id}
              onClick={() => openNotes(n.id)}
              className="flex flex-col gap-0.5 rounded-lg border bg-card p-2.5 text-left text-sm hover:border-primary/50"
            >
              <span className="font-medium">{n.title}</span>
              {snippet && <span className="line-clamp-2 text-xs text-muted-foreground">{snippet}</span>}
            </button>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhuma nota aponta para esta ainda. Escreva [[{note.title}]] em outra nota.
          </p>
        ),
        back.length,
      )}
      {outline.length > 0 &&
        section(
          "Sumário",
          outline.map((h, i) => (
            <button
              key={i}
              onClick={() => goto(i, h.line)}
              style={{ paddingLeft: (h.level - 1) * 12 + 6 }}
              className="truncate rounded-md py-1 pr-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {h.text}
            </button>
          )),
        )}
      {out.length > 0 &&
        section(
          "Links desta nota",
          out.map((t) => {
            const target = findByTitle(notes, t);
            return (
              <button
                key={t}
                onClick={() => openNoteByTitle(t, note.folder)}
                title={target ? "Abrir" : "Criar esta nota"}
                className={cn(
                  "truncate rounded-md px-1.5 py-1 text-left text-sm hover:bg-muted",
                  target ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {target ? "→ " : "+ "}
                {t}
              </button>
            );
          }),
          out.length,
        )}
      {tags.length > 0 &&
        section(
          "Tags",
          <div className="flex flex-wrap gap-1">
            {tags.map((t) => (
              <button
                key={t}
                onClick={() =>
                  setUi((u) => {
                    u.noteTag = t;
                    u.notesTab = "list";
                  })
                }
              >
                <Badge variant="outline">#{t}</Badge>
              </button>
            ))}
          </div>,
        )}
    </div>
  );
}
