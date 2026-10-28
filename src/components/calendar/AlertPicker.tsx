import { useState } from "react";
import { BellRing, Plus, X } from "lucide-react";
import { ALERT_PRESETS, alertLabel } from "@/lib/events";
import { cloudEnabled } from "@/lib/supabase";
import { useStore } from "@/store";
import { FieldDescription, FieldLegend, FieldSet } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** "Avisar por e-mail": preset reminders plus custom ones, in minutes before the start. Used by events and tasks. */
export function AlertPicker({
  value,
  onChange,
  allDay,
  what = "evento",
}: {
  value: number[];
  onChange: (v: number[]) => void;
  allDay: boolean;
  what?: string;
}) {
  const emailAlerts = useStore((s) => s.ws.settings.emailAlerts);
  const presets = ALERT_PRESETS.map((p) => String(p.minutes));
  const custom = value.filter((m) => !ALERT_PRESETS.some((p) => p.minutes === m));
  const hint = !cloudEnabled
    ? "Alertas por e-mail precisam de uma conta. Você pode escolher agora; eles começam a valer quando você entrar."
    : !emailAlerts
      ? "Os alertas por e-mail estão desligados nas Configurações."
      : allDay
        ? `Sem horário definido, o aviso usa 9:00 do dia como referência.`
        : "Você pode escolher mais de um.";
  return (
    <FieldSet>
      <FieldLegend variant="label" className="flex items-center gap-1.5">
        <BellRing className="size-4" aria-hidden="true" />
        Avisar por e-mail
      </FieldLegend>
      <FieldDescription>{hint}</FieldDescription>
      <ToggleGroup
        type="multiple"
        variant="outline"
        size="sm"
        spacing={2}
        className="flex-wrap"
        aria-label={`Quando avisar sobre este ${what}`}
        value={value.map(String).filter((v) => presets.includes(v))}
        onValueChange={(v) => onChange([...v.map(Number), ...custom].sort((a, b) => a - b))}
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
              onClick={() => onChange(value.filter((x) => x !== m))}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        <CustomAlert what={what} onAdd={(m) => onChange([...new Set([...value, m])].sort((a, b) => a - b))} />
      </div>
    </FieldSet>
  );
}

function CustomAlert({ onAdd, what }: { onAdd: (minutes: number) => void; what: string }) {
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
        <span className="text-sm font-medium">Avisar antes do {what}</span>
        <div className="flex gap-2">
          <Input
            type="number"
            inputMode="numeric"
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
