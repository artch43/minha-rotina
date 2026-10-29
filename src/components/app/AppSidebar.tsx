import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Folder,
  FolderInput,
  FolderOpen,
  FolderPlus,
  Home,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  Plus,
  Search,
  Settings,
  Sprout,
  Trash2,
} from "lucide-react";
import type { Page } from "@/lib/types";
import { cn } from "@/lib/utils";
import { childrenOf } from "@/lib/model";
import { boardFolderList } from "@/lib/notes";
import { cloudEnabled } from "@/lib/supabase";
import {
  addBoardFolder,
  celebrate,
  deleteBoardFolder,
  deletePage,
  go,
  moveBoardFolder,
  movePage,
  openModal,
  openNotes,
  renameBoardFolder,
  renamePage,
  setBoardFolderIcon,
  setPageFolder,
  useStore,
} from "@/store";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BoardDialog } from "./BoardDialog";
import { EmojiPicker } from "../common";

type SideDialog =
  | { kind: "edit"; pageId: string }
  | { kind: "newBoard"; folder: string }
  | { kind: "newFolder"; parent: string }
  | { kind: "renameFolder"; path: string };

const parentOf = (path: string) => (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "");
const nameOf = (path: string) => path.slice(path.lastIndexOf("/") + 1);

const OPEN_KEY = "board-folders-open";
function readOpenFolders(): string[] {
  try {
    return JSON.parse(localStorage.getItem(OPEN_KEY) || "[]");
  } catch {
    return [];
  }
}

export function Logo() {
  return (
    <span aria-hidden="true" className="flex h-6 items-end gap-1">
      <span className="h-6 w-2 rounded-full bg-area-coral" />
      <span className="h-4 w-2 rounded-full bg-area-petrol" />
      <span className="h-5 w-2 rounded-full bg-area-violet" />
    </span>
  );
}

export function AppSidebar() {
  const pages = useStore((s) => s.ws.pages);
  const name = useStore((s) => s.ws.settings.name);
  const route = useStore((s) => s.ui.route);
  const ws = useStore((s) => s.ws);
  const { setOpenMobile, isMobile } = useSidebar();
  const [dialog, setDialog] = useState<SideDialog | null>(null);
  const [remove, setRemove] = useState<string | null>(null);
  const [openFolders, setOpenFolders] = useState(readOpenFolders);
  /** What is being dragged, the folder it would land in ("" = top level) and which row is being renamed. */
  const [drag, setDrag] = useState<{ kind: "folder" | "board"; id: string } | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const icons = ws.settings.boardFolderIcons ?? {};
  const boards = childrenOf(ws, null).filter((p) => p.type === "db");
  const folders = boardFolderList(ws);
  // Opening a list (or creating one inside a folder) unfolds the folders around it.
  const activeFolder = boards.find((p) => p.id === route)?.folder;
  const toggleFolder = (path: string) => {
    const next = openFolders.includes(path) ? openFolders.filter((f) => f !== path) : [...openFolders, path];
    setOpenFolders(next);
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify(next));
    } catch {
      /* private mode: just don't remember */
    }
  };
  const showFolder = (path: string) => {
    const chain = path.split("/").map((_, i, a) => a.slice(0, i + 1).join("/"));
    const next = [...new Set([...openFolders, ...chain])];
    setOpenFolders(next);
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify(next));
    } catch {
      /* private mode: just don't remember */
    }
  };

  useEffect(() => {
    if (activeFolder) showFolder(activeFolder);
    // Only when another list is opened; the person can still close the folder afterwards.
  }, [route, activeFolder]);

  const canDrop = (into: string) => {
    if (!drag) return false;
    if (drag.kind === "board") return (boards.find((p) => p.id === drag.id)?.folder ?? "") !== into;
    return drag.id !== into && !into.startsWith(drag.id + "/") && parentOf(drag.id) !== into;
  };
  const dropProps = (into: string) => ({
    onDragOver: (e: React.DragEvent) => {
      // Stop here even when the drop isn't allowed, so the folder around it doesn't light up instead.
      e.stopPropagation();
      if (!canDrop(into)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (over !== into) setOver(into);
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver((o) => (o === into ? null : o));
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (drag && canDrop(into)) {
        if (drag.kind === "board") setPageFolder(drag.id, into, true);
        else moveBoardFolder(drag.id, into);
        if (into) showFolder(into);
      }
      setDrag(null);
      setOver(null);
    },
  });
  const dragProps = (kind: "folder" | "board", id: string) => ({
    draggable: renaming === null,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", id);
      setDrag({ kind, id });
    },
    onDragEnd: () => {
      setDrag(null);
      setOver(null);
    },
  });

  /** The lists and subfolders directly inside `parent` ("" is the top level). */
  const tree = (parent: string) => {
    const subs = folders.filter((f) => parentOf(f) === parent);
    const here = boards.filter((p) => (p.folder ?? "") === parent);
    return (
      <>
        {subs.map((f) => {
          const isOpen = openFolders.includes(f);
          const count = boards.filter((p) => p.folder === f || p.folder?.startsWith(f + "/")).length;
          return (
            <SidebarMenuItem
              key={"f:" + f}
              {...dropProps(f)}
              className={cn(
                "rounded-lg transition-colors",
                over === f && "bg-primary/10 ring-2 ring-primary/50",
                drag?.id === f && "opacity-50",
              )}
            >
              {renaming === "f:" + f ? (
                <InlineName
                  value={nameOf(f)}
                  label="Nome da pasta"
                  onDone={(v) => {
                    setRenaming(null);
                    const clean = v.replace(/\//g, "-").trim();
                    if (clean && clean !== nameOf(f)) renameBoardFolder(f, (parentOf(f) ? parentOf(f) + "/" : "") + clean);
                  }}
                />
              ) : (
                <SidebarMenuButton
                  {...dragProps("folder", f)}
                  aria-expanded={isOpen}
                  title="Clique para abrir. Clique duas vezes para renomear. Arraste para mover."
                  onClick={(e) => e.detail < 2 && toggleFolder(f)}
                  onDoubleClick={() => setRenaming("f:" + f)}
                >
                  <ChevronRight
                    className={cn("-mx-1 size-4! shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-90")}
                  />
                  {icons[f] ? (
                    <span className="w-5 text-center text-base leading-none">{icons[f]}</span>
                  ) : isOpen ? (
                    <FolderOpen />
                  ) : (
                    <Folder />
                  )}
                  <span>{nameOf(f)}</span>
                  {!isOpen && count > 0 && (
                    <span className="ml-auto pr-6 text-xs text-muted-foreground tabular-nums">{count}</span>
                  )}
                </SidebarMenuButton>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction showOnHover aria-label={`Opções da pasta ${nameOf(f)}`}>
                    <MoreHorizontal />
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start">
                  <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={() => setDialog({ kind: "newBoard", folder: f })}>
                      <Plus />
                      Nova lista aqui
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setDialog({ kind: "newFolder", parent: f })}>
                      <FolderPlus />
                      Nova subpasta
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setDialog({ kind: "renameFolder", path: f })}>
                      <Pencil />
                      Renomear e trocar ícone
                    </DropdownMenuItem>
                    {parentOf(f) && (
                      <DropdownMenuItem onSelect={() => moveBoardFolder(f, "")}>
                        <FolderInput />
                        Tirar da pasta {nameOf(parentOf(f))}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem variant="destructive" onSelect={() => deleteBoardFolder(f)}>
                      <Trash2 />
                      Excluir pasta (mantém as listas)
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              {isOpen && (
                <SidebarMenuSub className="mr-0 pr-0">
                  {tree(f)}
                  {subs.length === 0 && count === 0 && <li className="px-2 py-1.5 text-sm text-muted-foreground">Pasta vazia</li>}
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          );
        })}
        {here.map((p, i) => (
          <BoardItem
            key={p.id}
            p={p}
            active={route === p.id}
            first={i === 0}
            last={i === here.length - 1}
            dragging={drag?.id === p.id}
            renaming={renaming === "b:" + p.id}
            dragProps={dragProps("board", p.id)}
            dropProps={dropProps(p.folder ?? "")}
            onOpen={nav(() => go(p.id))}
            onStartRename={() => setRenaming("b:" + p.id)}
            onRenamed={(title) => {
              setRenaming(null);
              if (title.trim() && title.trim() !== p.title) {
                renamePage(p.id, title);
                celebrate("Lista renomeada", `Agora se chama “${title.trim()}”`, p.icon || "✏️");
              }
            }}
            onEdit={() => setDialog({ kind: "edit", pageId: p.id })}
            onRemove={() => setRemove(p.id)}
          />
        ))}
      </>
    );
  };
  const fixed = (type: string) => pages.find((p) => p.type === type);
  const nav = (fn: () => void) => () => {
    fn();
    if (isMobile) setOpenMobile(false);
  };
  const home = fixed("home"),
    cal = fixed("calendar"),
    habits = fixed("habits");
  const toRemove = pages.find((p) => p.id === remove);

  return (
    <Sidebar>
      <SidebarHeader className="gap-4 px-3 pt-5">
        <div className="flex items-center gap-2.5 px-1">
          <Logo />
          <span className="truncate text-lg font-extrabold tracking-tight">{name ? `Rotina de ${name}` : "Minha Rotina"}</span>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={nav(() => openModal("search"))} className="text-muted-foreground">
              <Search />
              <span>Buscar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {home && (
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={route === home.id} onClick={nav(() => go(home.id))}>
                    <Home />
                    <span>Início</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {cal && (
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={route === cal.id} onClick={nav(() => go(cal.id))}>
                    <CalendarDays />
                    <span>Calendário</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton isActive={route === "notes"} onClick={nav(() => openNotes())}>
                  <NotebookPen />
                  <span>Anotações</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {habits && (
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={route === habits.id} onClick={nav(() => go(habits.id))}>
                    <Sprout />
                    <span>Hábitos</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup {...dropProps("")}>
          <SidebarGroupLabel>Listas de tarefas</SidebarGroupLabel>
          <SidebarGroupAction
            title="Nova pasta"
            aria-label="Nova pasta de listas"
            className="right-11"
            onClick={() => setDialog({ kind: "newFolder", parent: "" })}
          >
            <FolderPlus />
          </SidebarGroupAction>
          <SidebarGroupAction title="Nova lista" aria-label="Nova lista de tarefas" onClick={nav(() => openModal("newBoard"))}>
            <Plus />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {tree("")}
              {drag && canDrop("") && (
                <li
                  className={cn(
                    "rounded-lg border-2 border-dashed px-3 py-2 text-sm text-muted-foreground transition-colors",
                    over === "" ? "border-primary bg-primary/10 text-foreground" : "border-border",
                  )}
                >
                  Solte aqui para tirar da pasta
                </li>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton className="text-muted-foreground" onClick={nav(() => openModal("newBoard"))}>
                  <Plus />
                  <span>Nova lista</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {cloudEnabled && (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={nav(() => openModal("trash"))}>
                <Trash2 />
                <span>Lixeira</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={nav(() => openModal("settings"))}>
              <Settings />
              <span>Configurações</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />

      {dialog?.kind === "edit" && <BoardDialog pageId={dialog.pageId} open onOpenChange={(o) => !o && setDialog(null)} />}
      {dialog?.kind === "newBoard" && <BoardDialog folder={dialog.folder} open onOpenChange={(o) => !o && setDialog(null)} />}
      {(dialog?.kind === "newFolder" || dialog?.kind === "renameFolder") && (
        <FolderDialog
          parent={dialog.kind === "newFolder" ? dialog.parent : parentOf(dialog.path)}
          current={dialog.kind === "renameFolder" ? dialog.path : undefined}
          onClose={() => setDialog(null)}
          onSaved={showFolder}
        />
      )}
      <AlertDialog open={!!remove} onOpenChange={(o) => !o && setRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{toRemove?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              A lista e todas as tarefas dela serão excluídas. Você pode desfazer logo em seguida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => remove && deletePage(remove)}>
              Excluir lista
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}

function BoardItem({
  p,
  active,
  first,
  last,
  dragging,
  renaming,
  dragProps,
  dropProps,
  onOpen,
  onStartRename,
  onRenamed,
  onEdit,
  onRemove,
}: {
  p: Page;
  active: boolean;
  first: boolean;
  last: boolean;
  dragging: boolean;
  renaming: boolean;
  dragProps: React.HTMLAttributes<HTMLElement> & { draggable: boolean };
  dropProps: React.HTMLAttributes<HTMLElement>;
  onOpen: () => void;
  onStartRename: () => void;
  onRenamed: (title: string) => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <SidebarMenuItem {...dropProps} className={cn("rounded-lg", dragging && "opacity-50")}>
      {renaming ? (
        <InlineName value={p.title} label="Nome da lista" icon={p.icon} onDone={onRenamed} />
      ) : (
        <SidebarMenuButton
          {...dragProps}
          isActive={active}
          title="Clique duas vezes para renomear. Arraste para uma pasta."
          onClick={(e) => e.detail < 2 && onOpen()}
          onDoubleClick={onStartRename}
        >
          <span className="w-5 text-center text-base leading-none">{p.icon}</span>
          <span>{p.title || "Sem título"}</span>
        </SidebarMenuButton>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction showOnHover aria-label={`Opções de ${p.title}`}>
            <MoreHorizontal />
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start">
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={onStartRename}>
              <Pencil />
              Renomear
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onEdit}>
              <FolderInput />
              Mover para pasta e ícone
            </DropdownMenuItem>
            <DropdownMenuItem disabled={first} onSelect={() => movePage(p.id, -1)}>
              <ChevronUp />
              Mover para cima
            </DropdownMenuItem>
            <DropdownMenuItem disabled={last} onSelect={() => movePage(p.id, 1)}>
              <ChevronDown />
              Mover para baixo
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem variant="destructive" onSelect={onRemove}>
              <Trash2 />
              Excluir lista
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

/** Renaming in place: Enter or leaving the field saves, Esc cancels. */
function InlineName({
  value,
  label,
  icon,
  onDone,
}: {
  value: string;
  label: string;
  icon?: string;
  onDone: (v: string) => void;
}) {
  const [v, setV] = useState(value);
  return (
    <div className="flex h-10 items-center gap-2 px-1.5">
      {icon && <span className="w-5 text-center text-base leading-none">{icon}</span>}
      <Input
        autoFocus
        aria-label={label}
        value={v}
        className="h-8 px-2"
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => onDone(v)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") onDone(value);
        }}
      />
    </div>
  );
}

/** Name a new folder (inside `parent`) or rename `current`. */
function FolderDialog({
  parent,
  current,
  onClose,
  onSaved,
}: {
  parent: string;
  current?: string;
  onClose: () => void;
  onSaved: (path: string) => void;
}) {
  const [name, setName] = useState(current ? nameOf(current) : "");
  const [icon, setIcon] = useState(() => (current && useStore.getState().ws.settings.boardFolderIcons?.[current]) || "📁");
  const nameRef = useRef<HTMLInputElement>(null);
  const save = () => {
    const clean = name.replace(/\//g, "-").trim();
    if (!clean) return;
    const full = (parent ? parent + "/" : "") + clean;
    if (current) renameBoardFolder(current, full);
    else addBoardFolder(full);
    setBoardFolderIcon(full, icon);
    onSaved(full);
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="sm:max-w-sm"
        onOpenAutoFocus={(e) => {
          // Start in the name field (not the icon button), also when opened from a menu.
          e.preventDefault();
          nameRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {current ? "Renomear pasta" : parent ? `Nova pasta em ${parent.split("/").join(" › ")}` : "Nova pasta"}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex gap-2">
            <EmojiPicker value={icon} onChange={setIcon} label="Ícone da pasta" className="shrink-0 border" />
            <Input
              ref={nameRef}
              autoComplete="off"
              aria-label="Nome da pasta"
              placeholder="Ex.: Faculdade, Casa, Trabalho…"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              {current ? "Salvar" : "Criar pasta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
