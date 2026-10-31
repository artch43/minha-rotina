import { useRef, useState, type FormEvent } from "react";
import type { PropValue } from "@/lib/types";
import { celebrate, newItem, openPeek, useStore } from "@/store";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * "Nova tarefa": a short form (name, and a date if you want). Nothing is saved until "Criar",
 * so cancelling leaves no empty task behind. "Mais detalhes" creates it and opens the full panel
 * (status, area, priority, alarm, notes).
 */
export function NewTaskDialog({
  dbId,
  defaults,
  date: startDate = "",
  onClose,
}: {
  dbId: string;
  defaults: Record<string, PropValue>;
  date?: string;
  onClose: () => void;
}) {
  const page = useStore((s) => s.ws.pages.find((p) => p.id === dbId));
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(startDate.slice(0, 10));
  const [time, setTime] = useState("");
  const [error, setError] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const create = (more: boolean) => {
    const name = title.trim();
    if (!name) {
      setError(true);
      nameRef.current?.focus();
      return;
    }
    const props: Record<string, PropValue> = { ...defaults };
    if (date) props.date = date + (time ? "T" + time : "");
    const id = newItem(dbId, props, name);
    if (!date) celebrate(`Tarefa “${name}” criada`, page ? `Em ${page.title}` : undefined, "✅");
    onClose();
    if (more) openPeek(id);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    create(false);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova tarefa</DialogTitle>
          <DialogDescription>{page ? `Em ${page.title}. ` : ""}Só o nome é obrigatório.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-5">
          <FieldGroup>
            <Field data-invalid={error || undefined}>
              <FieldLabel htmlFor="new-task-title">O que precisa ser feito?</FieldLabel>
              <Input
                id="new-task-title"
                ref={nameRef}
                autoFocus
                autoComplete="off"
                placeholder="Ex.: Pagar a conta de luz"
                aria-invalid={error || undefined}
                aria-describedby={error ? "new-task-error" : undefined}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setError(false);
                }}
              />
              {error && (
                <p id="new-task-error" className="text-sm text-destructive">
                  Dê um nome à tarefa.
                </p>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="new-task-date">Prazo (opcional)</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="new-task-date"
                  type="date"
                  className="min-w-0 flex-1"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                <Input
                  type="time"
                  aria-label="Horário (opcional)"
                  className="w-28"
                  disabled={!date}
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </Field>
          </FieldGroup>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="ghost" onClick={() => create(true)}>
              Mais detalhes…
            </Button>
            <div className="flex gap-2 max-sm:flex-col-reverse">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">Criar tarefa</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
