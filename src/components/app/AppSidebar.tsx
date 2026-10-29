import { useEffect, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
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
import { childrenOf } from "@/lib/model";
import { boardFolderList } from "@/lib/notes";
import { cloudEnabled } from "@/lib/supabase";
import {
  addBoardFolder,
  deleteBoardFolder,
  deletePage,
  go,
  movePage,
  openModal,
  openNotes,
  renameBoardFolder,
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
            <SidebarMenuItem key={"f:" + f}>
              <SidebarMenuButton aria-expanded={isOpen} onClick={() => toggleFolder(f)}>
                {isOpen ? <FolderOpen /> : <Folder />}
                <span>{nameOf(f)}</span>
                {!isOpen && count > 0 && (
                  <span className="ml-auto pr-6 text-xs text-muted-foreground tabular-nums">{count}</span>
                )}
              </SidebarMenuButton>
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
                      Renomear pasta
                    </DropdownMenuItem>
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
                  {subs.length === 0 && count === 0 && (
                    <li className="px-2 py-1.5 text-sm text-muted-foreground">Pasta vazia</li>
                  )}
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
            onOpen={nav(() => go(p.id))}
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
        <SidebarGroup>
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
      {dialog?.kind === "newBoard" && (
        <BoardDialog folder={dialog.folder} open onOpenChange={(o) => !o && setDialog(null)} />
      )}
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
  onOpen,
  onEdit,
  onRemove,
}: {
  p: Page;
  active: boolean;
  first: boolean;
  last: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton isActive={active} onClick={onOpen}>
        <span className="w-5 text-center text-base leading-none">{p.icon}</span>
        <span>{p.title || "Sem título"}</span>
      </SidebarMenuButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction showOnHover aria-label={`Opções de ${p.title}`}>
            <MoreHorizontal />
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start">
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil />
              Renomear
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onEdit}>
              <FolderInput />
              Mover para pasta
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
  const save = () => {
    const clean = name.replace(/\//g, "-").trim();
    if (!clean) return;
    const full = (parent ? parent + "/" : "") + clean;
    if (current) renameBoardFolder(current, full);
    else addBoardFolder(full);
    onSaved(full);
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
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
          <Input
            autoFocus
            autoComplete="off"
            aria-label="Nome da pasta"
            placeholder="Ex.: Faculdade, Casa, Trabalho…"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
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
