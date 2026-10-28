import { useState, type FormEvent } from "react";
import { CalendarDays, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Todo } from "@/lib/types";
import { inArea } from "@/lib/events";
import { addDays, fmtDate, today } from "@/lib/util";
import { addTodo, clearDoneTodos, deleteTodo, toggleTodo, updateTodo, useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AreaDot, areaVar, useAreas } from "./common";

const NONE = "__none";

/** A quick to-do list: type, press Enter, tick it off. */
export function TodoPage() {
  const todos = useStore((s) => s.ws.todos);
  const area = useStore((s) => s.ui.area);
  const [text, setText] = useState("");
  const [when, setWhen] = useState<"" | "today" | "tomorrow">("");
  const T = today();
  const list = Object.values(todos).filter((t) => inArea(t.area, area));
  const open = list.filter((t) => !t.done);
  const byOrder = (a: Todo, b: Todo) => (a.date ?? "9999").localeCompare(b.date ?? "9999") || a.order - b.order;
  const groups: [string, Todo[]][] = [
    ["Atrasados", open.filter((t) => t.date && t.date < T).sort(byOrder)],
    ["Hoje", open.filter((t) => t.date === T).sort(byOrder)],
    ["Próximos", open.filter((t) => t.date && t.date > T).sort(byOrder)],
    ["Sem data", open.filter((t) => !t.date).sort(byOrder)],
  ];
  const done = list.filter((t) => t.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    addTodo(text, when ? { date: when === "today" ? T : addDays(T, 1) } : {});
    setText("");
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:px-8">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">To-do</h1>
      <form onSubmit={submit} className="flex flex-col gap-2 rounded-xl border bg-card p-2 shadow-xs sm:flex-row sm:items-center">
        <Input
          autoComplete="off"
          aria-label="Novo afazer"
          placeholder="O que você precisa fazer?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="border-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
        <div className="flex items-center gap-2">
          <Select value={when || NONE} onValueChange={(v) => setWhen(v === NONE ? "" : (v as "today" | "tomorrow"))}>
            <SelectTrigger aria-label="Quando" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={NONE}>Sem data</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="tomorrow">Amanhã</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button type="submit" disabled={!text.trim()}>
            <Plus data-icon="inline-start" />
            Adicionar
          </Button>
        </div>
      </form>

      {!open.length && !done.length && (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Nada por aqui</EmptyTitle>
            <EmptyDescription>
              {area === "all"
                ? "Escreva o primeiro afazer acima e tecle Enter."
                : "Nenhum afazer nesta área. Troque a área no topo ou adicione um."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {groups
        .filter(([, xs]) => xs.length)
        .map(([title, xs]) => (
          <section key={title} className="flex flex-col gap-1">
            <h2 className={cn("text-sm font-semibold", title === "Atrasados" ? "text-destructive" : "text-muted-foreground")}>
              {title} <span className="font-normal tabular-nums">{xs.length}</span>
            </h2>
            <ul className="flex flex-col">
              {xs.map((t) => (
                <TodoRow key={t.id} t={t} />
              ))}
            </ul>
          </section>
        ))}

      {done.length > 0 && (
        <section className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Concluídos <span className="font-normal tabular-nums">{done.length}</span>
            </h2>
            <Button variant="ghost" size="sm" onClick={clearDoneTodos}>
              <Trash2 data-icon="inline-start" />
              Apagar concluídos
            </Button>
          </div>
          <ul className="flex flex-col">
            {done.slice(0, 30).map((t) => (
              <TodoRow key={t.id} t={t} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function TodoRow({ t, compact }: { t: Todo; compact?: boolean }) {
  const areas = useAreas();
  const area = areas.find((a) => a.id === t.area);
  const [text, setText] = useState(t.text);
  const late = !t.done && t.date && t.date < today();
  return (
    <li
      data-del={"todo:" + t.id}
      style={areaVar(area)}
      className={cn("area-stripe group flex items-center gap-3 rounded-lg py-1.5 pr-1 pl-4 hover:bg-muted/60", compact && "py-1")}
    >
      <Checkbox
        checked={t.done}
        onCheckedChange={() => toggleTodo(t.id)}
        aria-label={t.done ? `Desmarcar ${t.text}` : `Concluir ${t.text}`}
      />
      {compact ? (
        <span className={cn("min-w-0 flex-1 truncate text-sm", t.done && "text-muted-foreground line-through")}>{t.text}</span>
      ) : (
        <input
          aria-label="Texto do afazer"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => (text.trim() ? updateTodo(t.id, { text: text.trim() }) : setText(t.text))}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className={cn("min-w-0 flex-1 bg-transparent text-sm outline-none", t.done && "text-muted-foreground line-through")}
        />
      )}
      {t.date && (
        <span className={cn("shrink-0 text-xs tabular-nums", late ? "font-medium text-destructive" : "text-muted-foreground")}>
          {fmtDate(t.date)}
        </span>
      )}
      {!compact && (
        <div className="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Data e área">
                <CalendarDays />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="flex w-64 flex-col gap-3">
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Dia
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={t.date ?? ""}
                    onChange={(e) => updateTodo(t.id, { date: e.target.value || undefined })}
                  />
                  {t.date && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Tirar data"
                      onClick={() => updateTodo(t.id, { date: undefined })}
                    >
                      <X />
                    </Button>
                  )}
                </div>
              </label>
              <div className="flex flex-col gap-1.5 text-sm font-medium">
                Área
                <Select value={t.area ?? NONE} onValueChange={(v) => updateTodo(t.id, { area: v === NONE ? undefined : v })}>
                  <SelectTrigger aria-label="Área" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={NONE}>Sem área</SelectItem>
                      {areas.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          <AreaDot area={a} />
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon-sm" aria-label={`Excluir ${t.text}`} onClick={() => deleteTodo(t.id)}>
            <Trash2 />
          </Button>
        </div>
      )}
    </li>
  );
}
