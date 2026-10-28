import { useState } from "react";
import {
  CalendarDays,
  ListTodo,
  ChevronDown,
  ChevronUp,
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
import { childrenOf } from "@/lib/model";
import { cloudEnabled } from "@/lib/supabase";
import { deletePage, go, movePage, openModal, openNotes, useStore } from "@/store";
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
import { Kbd } from "@/components/ui/kbd";
import { BoardDialog } from "./BoardDialog";

export function Logo() {
  return (
    <span aria-hidden="true" className="flex h-5 items-end gap-[3px]">
      <span className="h-5 w-1.5 rounded-full bg-area-coral" />
      <span className="h-3.5 w-1.5 rounded-full bg-area-petrol" />
      <span className="h-4.5 w-1.5 rounded-full bg-area-violet" />
    </span>
  );
}

export function AppSidebar() {
  const pages = useStore((s) => s.ws.pages);
  const name = useStore((s) => s.ws.settings.name);
  const route = useStore((s) => s.ui.route);
  const ws = useStore((s) => s.ws);
  const { setOpenMobile, isMobile } = useSidebar();
  const [rename, setRename] = useState<string | null>(null);
  const [remove, setRemove] = useState<string | null>(null);
  const boards = childrenOf(ws, null).filter((p) => p.type === "db");
  const fixed = (type: string) => pages.find((p) => p.type === type);
  const nav = (fn: () => void) => () => {
    fn();
    if (isMobile) setOpenMobile(false);
  };
  const home = fixed("home"),
    cal = fixed("calendar"),
    habits = fixed("habits"),
    todo = fixed("todo");
  const toRemove = pages.find((p) => p.id === remove);

  return (
    <Sidebar>
      <SidebarHeader className="gap-3 px-3 pt-4">
        <div className="flex items-center gap-2.5 px-1">
          <Logo />
          <span className="truncate text-base font-bold tracking-tight">{name ? `Rotina de ${name}` : "Minha Rotina"}</span>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={nav(() => openModal("search"))} className="text-muted-foreground">
              <Search />
              <span>Buscar</span>
              <Kbd className="ml-auto">⌘K</Kbd>
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
              {todo && (
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={route === todo.id} onClick={nav(() => go(todo.id))}>
                    <ListTodo />
                    <span>To-do</span>
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
          <SidebarGroupAction title="Nova lista" aria-label="Nova lista de tarefas" onClick={nav(() => openModal("newBoard"))}>
            <Plus />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {boards.map((p, i) => (
                <SidebarMenuItem key={p.id}>
                  <SidebarMenuButton isActive={route === p.id} onClick={nav(() => go(p.id))}>
                    <span className="w-4 text-center text-sm leading-none">{p.icon}</span>
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
                        <DropdownMenuItem onSelect={() => setRename(p.id)}>
                          <Pencil />
                          Renomear
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={i === 0} onSelect={() => movePage(p.id, -1)}>
                          <ChevronUp />
                          Mover para cima
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={i === boards.length - 1} onSelect={() => movePage(p.id, 1)}>
                          <ChevronDown />
                          Mover para baixo
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuItem variant="destructive" onSelect={() => setRemove(p.id)}>
                          <Trash2 />
                          Excluir lista
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              ))}
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

      {rename && <BoardDialog pageId={rename} open onOpenChange={(o) => !o && setRename(null)} />}
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
