import { CalendarDays, CheckSquare, FileText, LayoutGrid, ListTodo } from "lucide-react";
import { go, openEvent, openNotes, openPeek, useStore } from "@/store";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { fmtDate } from "@/lib/util";

/** Ctrl/Cmd + K: find pages, tasks, events, to-dos and notes. */
export function Search() {
  const ws = useStore((s) => s.ws);
  const setUi = useStore((s) => s.setUi);
  const close = () =>
    setUi((u) => {
      u.modal = null;
    });
  const run = (fn: () => void) => () => {
    close();
    fn();
  };
  const todoPage = ws.pages.find((p) => p.type === "todo");
  return (
    <CommandDialog
      open
      onOpenChange={(o) => !o && close()}
      title="Buscar"
      description="Busque páginas, tarefas, eventos, afazeres e anotações"
    >
      <CommandInput placeholder="Buscar páginas, tarefas, eventos e anotações…" />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>
        <CommandGroup heading="Páginas">
          {ws.pages.map((p) => (
            <CommandItem key={p.id} value={"pagina " + p.title} onSelect={run(() => go(p.id))}>
              <LayoutGrid />
              {p.icon} {p.title}
            </CommandItem>
          ))}
          <CommandItem value="pagina anotacoes" onSelect={run(() => openNotes(null))}>
            <FileText />
            📓 Anotações
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Tarefas">
          {Object.values(ws.items)
            .filter((i) => i.title)
            .slice(0, 200)
            .map((i) => (
              <CommandItem
                key={i.id}
                value={"tarefa " + i.title + " " + i.id}
                onSelect={run(() => {
                  go(i.db);
                  openPeek(i.id);
                })}
              >
                <CheckSquare />
                <span className="truncate">{i.title}</span>
                <span className="ml-auto text-xs text-muted-foreground">{ws.pages.find((p) => p.id === i.db)?.title}</span>
              </CommandItem>
            ))}
        </CommandGroup>
        <CommandGroup heading="Eventos">
          {Object.values(ws.events)
            .slice(0, 200)
            .map((e) => (
              <CommandItem
                key={e.id}
                value={"evento " + e.title + " " + e.id}
                onSelect={run(() => {
                  const c = ws.pages.find((p) => p.type === "calendar");
                  if (c) go(c.id);
                  openEvent(e.id);
                })}
              >
                <CalendarDays />
                <span className="truncate">{e.title}</span>
                <span className="ml-auto text-xs text-muted-foreground">{fmtDate(e.date)}</span>
              </CommandItem>
            ))}
        </CommandGroup>
        <CommandGroup heading="To-do">
          {Object.values(ws.todos)
            .filter((t) => !t.done)
            .slice(0, 200)
            .map((t) => (
              <CommandItem key={t.id} value={"afazer " + t.text + " " + t.id} onSelect={run(() => todoPage && go(todoPage.id))}>
                <ListTodo />
                <span className="truncate">{t.text}</span>
              </CommandItem>
            ))}
        </CommandGroup>
        <CommandGroup heading="Anotações">
          {Object.values(ws.notes).map((n) => (
            <CommandItem
              key={n.id}
              value={"nota " + n.title + " " + n.body.slice(0, 400) + " " + n.id}
              onSelect={run(() => openNotes(n.id))}
            >
              <FileText />
              <span className="truncate">{n.title}</span>
              {n.folder && <span className="ml-auto text-xs text-muted-foreground">{n.folder}</span>}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
