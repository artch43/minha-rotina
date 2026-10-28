import { useEffect, useState, type FormEvent } from "react";
import { BellRing, Plus, Trash2, X } from "lucide-react";
import type { CalendarEvent } from "@/lib/types";
import { ALERT_PRESETS, alertLabel, minutesOf } from "@/lib/events";
import { cloudEnabled } from "@/lib/supabase";
import { pad, today } from "@/lib/util";
import { deleteEvent, saveEvent, useStore } from "@/store";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AreaDot, useAreas } from "../common";

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
  const presetValues = ALERT_PRESETS.map((p) => String(p.minutes));
  const custom = d.alerts.filter((m) => !ALERT_PRESETS.some((p) => p.minutes === m));
  const emailOff = !cloudEnabled || !settings.emailAlerts;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!d.title.trim()) return setError("Dê um nome ao evento.");
    if (!d.allDay && d.end && minutesOf(d.end) < minutesOf(d.start)) return setError("O fim precisa ser depois do início.");
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
                <Select value={d.area ?? NONE} onValueChange={(v) => set({ area: v === NONE ? undefined : v })}>
                  <SelectTrigger id="ev-area" className="w-full">
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

            <FieldSet>
              <FieldLegend variant="label" className="flex items-center gap-1.5">
                <BellRing className="size-4" />
                Avisar por e-mail
              </FieldLegend>
              <FieldDescription>
                {emailOff
                  ? !cloudEnabled
                    ? "Alertas por e-mail precisam de uma conta. Você pode escolher agora; eles começam a valer quando você entrar."
                    : "Os alertas por e-mail estão desligados nas Configurações."
                  : d.allDay
                    ? "Para eventos de dia inteiro, o horário de referência é 9:00."
                    : "Você pode escolher mais de um."}
              </FieldDescription>
              <ToggleGroup
                type="multiple"
                variant="outline"
                size="sm"
                spacing={2}
                className="flex-wrap"
                value={d.alerts.map(String).filter((v) => presetValues.includes(v))}
                onValueChange={(v) => set({ alerts: [...v.map(Number), ...custom] })}
              >
                {ALERT_PRESETS.map((p) => (
                  <ToggleGroupItem key={p.minutes} value={String(p.minutes)} className="px-2.5">
                    {p.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <div className="flex flex-wrap items-center gap-2">
                {custom.map((m) => (
                  <Badge key={m} variant="secondary" className="gap-1 pr-1">
                    {alertLabel(m)}
                    <button
                      type="button"
                      aria-label={`Tirar ${alertLabel(m)}`}
                      className="rounded-full p-0.5 hover:bg-background"
                      onClick={() => set({ alerts: d.alerts.filter((x) => x !== m) })}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
                <CustomAlert onAdd={(m) => set({ alerts: [...d.alerts, m] })} />
              </div>
            </FieldSet>

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

function CustomAlert({ onAdd }: { onAdd: (minutes: number) => void }) {
  const [open, setOpen] = useState(false);
  const [n, setN] = useState("2");
  const [unit, setUnit] = useState("60");
  const add = () => {
    const v = Math.round(Number(n));
    if (v > 0) {
      onAdd(v * Number(unit));
      setOpen(false);
    }
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm">
          <Plus data-icon="inline-start" />
          Personalizado
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex w-72 flex-col gap-3" align="start">
        <span className="text-sm font-medium">Avisar antes do evento</span>
        <div className="flex gap-2">
          <Input
            type="number"
            min={1}
            aria-label="Quantidade"
            className="w-20"
            value={n}
            onChange={(e) => setN(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger aria-label="Unidade" className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="1">minutos</SelectItem>
                <SelectItem value="60">horas</SelectItem>
                <SelectItem value="1440">dias</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <Button type="button" onClick={add}>
          Adicionar alerta
        </Button>
      </PopoverContent>
    </Popover>
  );
}
