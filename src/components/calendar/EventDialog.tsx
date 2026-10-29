import { useEffect, useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import type { CalendarEvent, Repeat } from "@/lib/types";
import { AlertPicker } from "./AlertPicker";
import { REPEAT_LABELS, minutesOf } from "@/lib/events";
import { pad, today } from "@/lib/util";
import { deleteEvent, saveEvent, useStore } from "@/store";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AreaDot, NewAreaButton, useAreas } from "../common";
import { Kbd } from "@/components/ui/kbd";
import { MOD } from "@/lib/shortcuts";

type Draft = Omit<CalendarEvent, "id" | "created" | "updated">;
const NONE = "__none";
const plusHour = (hhmm: string) => {
  const m = Math.min(minutesOf(hhmm) + 60, 23 * 60 + 59);
  return pad(Math.floor(m / 60)) + ":" + pad(m % 60);
};

export function EventDialog() {
  const req = useStore((s) => s.ui.eventDialog);
  const existing = useStore((s) => (req?.id ? s.ws.events[req.id] : undefined));
  const settings = useStore((s) => s.ws.settings);
  const area = useStore((s) => s.ui.area);
  const setUi = useStore((s) => s.setUi);
  const areas = useAreas();
  const [d, setD] = useState<Draft | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!req) {
      setD(null);
      return;
    }
    setError("");
    if (existing) {
      const { id: _id, created: _c, updated: _u, ...rest } = existing;
      void _id;
      void _c;
      void _u;
      setD(rest);
      return;
    }
    const start = req.start ?? "09:00";
    setD({
      title: "",
      date: req.date ?? today(),
      allDay: false,
      start,
      end: plusHour(start),
      area: area !== "all" ? area : undefined,
      location: "",
      notes: "",
      alerts: [...settings.defaultAlerts],
    });
  }, [req?.id, req?.date, req?.start]);

  const close = () =>
    setUi((u) => {
      u.eventDialog = null;
    });
  if (!req || !d) return null;
  const set = (p: Partial<Draft>) => setD({ ...d, ...p });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!d.title.trim()) return setError("Dê um nome ao evento.");
    if (!d.allDay && d.end && minutesOf(d.end) < minutesOf(d.start)) return setError("O fim precisa ser depois do início.");
    if (d.repeat && d.repeat !== "none" && d.repeatUntil && d.repeatUntil < d.date)
      return setError("A data final da repetição precisa ser depois do primeiro dia.");
    saveEvent({ ...d, title: d.title.trim(), alerts: [...new Set(d.alerts)].sort((a, b) => a - b) }, req.id);
    close();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? "Editar evento" : "Novo evento"}</DialogTitle>
          <DialogDescription>Escolha quando quer ser avisado por e-mail.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-6">
          <FieldGroup>
            <Field data-invalid={!!error && !d.title.trim()}>
              <FieldLabel htmlFor="ev-title">Nome</FieldLabel>
              <Input
                id="ev-title"
                autoFocus
                data-title-field
                autoComplete="off"
                placeholder="Ex.: consulta, aula, reunião…"
                value={d.title}
                aria-invalid={!!error && !d.title.trim()}
                onChange={(e) => set({ title: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
              <Field>
                <FieldLabel htmlFor="ev-date">Dia</FieldLabel>
                <Input id="ev-date" type="date" required value={d.date} onChange={(e) => set({ date: e.target.value })} />
              </Field>
              <Field orientation="horizontal" className="items-end pb-2 sm:pb-1.5">
                <Switch id="ev-allday" checked={d.allDay} onCheckedChange={(v) => set({ allDay: v })} />
                <FieldLabel htmlFor="ev-allday">Dia inteiro</FieldLabel>
              </Field>
            </div>
            {!d.allDay && (
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="ev-start">Início</FieldLabel>
                  <Input
                    id="ev-start"
                    type="time"
                    required
                    value={d.start}
                    onChange={(e) => {
                      const start = e.target.value;
                      set({ start, end: !d.end || minutesOf(d.end) <= minutesOf(start) ? plusHour(start) : d.end });
                    }}
                  />
                </Field>
                <Field data-invalid={!!error && minutesOf(d.end) < minutesOf(d.start)}>
                  <FieldLabel htmlFor="ev-end">Fim</FieldLabel>
                  <Input id="ev-end" type="time" value={d.end} onChange={(e) => set({ end: e.target.value })} />
                </Field>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="ev-area">Área</FieldLabel>
                <div className="flex gap-2">
                  <Select value={d.area ?? NONE} onValueChange={(v) => set({ area: v === NONE ? undefined : v })}>
                    <SelectTrigger id="ev-area" className="w-full min-w-0 flex-1">
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
                  <NewAreaButton className="size-9" onCreated={(id) => set({ area: id })} />
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor="ev-loc">Local</FieldLabel>
                <Input
                  id="ev-loc"
                  placeholder="Opcional…"
                  value={d.location}
                  onChange={(e) => set({ location: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="ev-repeat">Repetir</FieldLabel>
                <Select
                  value={d.repeat ?? "none"}
                  onValueChange={(v) => set({ repeat: v as Repeat, ...(v === "none" ? { repeatUntil: undefined } : {}) })}
                >
                  <SelectTrigger id="ev-repeat" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {(Object.entries(REPEAT_LABELS) as [Repeat, string][]).map(([k, n]) => (
                        <SelectItem key={k} value={k}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              {d.repeat && d.repeat !== "none" && (
                <Field>
                  <FieldLabel htmlFor="ev-until">Até (opcional)</FieldLabel>
                  <Input
                    id="ev-until"
                    type="date"
                    min={d.date}
                    value={d.repeatUntil ?? ""}
                    onChange={(e) => set({ repeatUntil: e.target.value || undefined })}
                  />
                </Field>
              )}
            </div>
            {d.repeat && d.repeat !== "none" && existing && (
              <FieldDescription>As mudanças valem para todas as datas deste evento.</FieldDescription>
            )}

            <AlertPicker
              value={d.alerts}
              onChange={(alerts) => set({ alerts })}
              channel={d.alertChannel ?? "email"}
              onChannelChange={(alertChannel) => set({ alertChannel })}
              allDay={d.allDay}
            />

            <Field>
              <FieldLabel htmlFor="ev-notes">Descrição</FieldLabel>
              <Textarea
                id="ev-notes"
                placeholder="Opcional…"
                value={d.notes}
                className="min-h-20 field-sizing-content"
                onChange={(e) => set({ notes: e.target.value })}
              />
            </Field>
            {error && <FieldError>{error}</FieldError>}
          </FieldGroup>
          <DialogFooter className="gap-2 sm:justify-between">
            {existing ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive"
                onClick={() => {
                  deleteEvent(existing.id);
                  close();
                }}
              >
                <Trash2 data-icon="inline-start" />
                Excluir evento
                <Kbd className="ml-1 hidden sm:inline-flex">{MOD}⌫</Kbd>
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={close}>
                Cancelar
              </Button>
              <Button type="submit">Salvar evento</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
