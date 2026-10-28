import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { Area, AreaColor, Color, Option } from "@/lib/types";
import { addArea, useStore } from "@/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { EMOJIS } from "@/lib/util";
import { useState } from "react";
import { Plus } from "lucide-react";

export const AREA_COLORS: { id: AreaColor; name: string }[] = [
  { id: "coral", name: "Coral" },
  { id: "petrol", name: "Azul-petróleo" },
  { id: "violet", name: "Violeta" },
  { id: "amber", name: "Âmbar" },
  { id: "green", name: "Verde" },
  { id: "pink", name: "Rosa" },
  { id: "sky", name: "Azul-céu" },
  { id: "slate", name: "Grafite" },
];
export const TAG_COLORS: { id: Color; name: string }[] = [
  { id: "gray", name: "Cinza" },
  { id: "brown", name: "Marrom" },
  { id: "orange", name: "Laranja" },
  { id: "yellow", name: "Amarelo" },
  { id: "green", name: "Verde" },
  { id: "blue", name: "Azul" },
  { id: "purple", name: "Roxo" },
  { id: "pink", name: "Rosa" },
  { id: "red", name: "Vermelho" },
];

export const areaVar = (a?: Pick<Area, "color"> | null): CSSProperties =>
  a ? ({ "--area": `var(--area-${a.color})` } as CSSProperties) : {};

export function useAreas() {
  return useStore((s) => s.ws.settings.areas);
}
export function useArea(id?: string) {
  return useStore((s) => (id ? s.ws.settings.areas.find((a) => a.id === id) : undefined));
}

export function AreaDot({ area, className }: { area?: Pick<Area, "color"> | null; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-2.5 shrink-0 rounded-full bg-(--area,var(--border))", className)}
      style={areaVar(area)}
    />
  );
}

/** Status, priority or tag shown in its color. */
export function OptionBadge({ opt, dot, className }: { opt?: Option; dot?: boolean; className?: string }) {
  if (!opt) return null;
  return (
    <Badge variant="outline" data-color={opt.color} className={cn("tag-color max-w-full font-medium", className)}>
      {dot && <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />}
      <span className="truncate">{opt.name}</span>
    </Badge>
  );
}

export function TagSwatches({ value, onChange }: { value: Color; onChange: (c: Color) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Cor">
      {TAG_COLORS.map((c) => (
        <button
          key={c.id}
          type="button"
          role="radio"
          aria-checked={value === c.id}
          aria-label={c.name}
          title={c.name}
          data-color={c.id}
          onClick={() => onChange(c.id)}
          className={cn(
            "swatch-color size-6 rounded-full ring-offset-2 ring-offset-background transition",
            value === c.id ? "ring-2 ring-foreground" : "hover:scale-110",
          )}
        />
      ))}
    </div>
  );
}

export function AreaSwatches({ value, onChange }: { value: AreaColor; onChange: (c: AreaColor) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Cor da área">
      {AREA_COLORS.map((c) => (
        <button
          key={c.id}
          type="button"
          role="radio"
          aria-checked={value === c.id}
          aria-label={c.name}
          title={c.name}
          onClick={() => onChange(c.id)}
          style={areaVar({ color: c.id })}
          className={cn(
            "size-6 rounded-full bg-(--area) ring-offset-2 ring-offset-background transition",
            value === c.id ? "ring-2 ring-foreground" : "hover:scale-110",
          )}
        />
      ))}
    </div>
  );
}

export function EmojiPicker({
  value,
  onChange,
  label = "Trocar ícone",
}: {
  value: string;
  onChange: (e: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const pick = (e: string) => {
    onChange(e);
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} className="text-lg">
          {value}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="grid grid-cols-8 gap-0.5">
          {EMOJIS.map((e) => (
            <Button key={e} variant="ghost" size="icon-sm" className="text-base" onClick={() => pick(e)}>
              {e}
            </Button>
          ))}
        </div>
        <Input
          className="mt-2"
          placeholder="Ou cole um emoji e tecle Enter…"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && custom.trim()) pick([...custom.trim()].slice(0, 2).join(""));
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export function greeting(name?: string) {
  const h = new Date().getHours();
  return (h < 5 ? "Boa noite" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite") + (name ? `, ${name}` : "");
}

/** "+" button that opens a small form to create an area. Calls onCreated with the new area's id. */
export function NewAreaButton({
  onCreated,
  className,
  label = "Nova área",
  showLabel = false,
}: {
  onCreated?: (id: string) => void;
  className?: string;
  label?: string;
  showLabel?: boolean;
}) {
  const areas = useAreas();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const nextColor = () => AREA_COLORS.find((c) => !areas.some((a) => a.color === c.id))?.id ?? "amber";
  const [color, setColor] = useState<AreaColor>(nextColor);
  const create = () => {
    if (!name.trim()) return;
    const id = addArea(name, color);
    setOpen(false);
    setName("");
    onCreated?.(id);
  };
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setColor(nextColor());
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={showLabel ? "sm" : "icon-sm"}
          aria-label={showLabel ? undefined : label}
          title={label}
          className={className}
        >
          <Plus data-icon={showLabel ? "inline-start" : undefined} />
          {showLabel && label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            create();
          }}
        >
          <Input
            autoFocus
            autoComplete="off"
            aria-label="Nome da área"
            placeholder="Ex.: Saúde, Casa, Faculdade…"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <AreaSwatches value={color} onChange={setColor} />
          <Button type="submit" disabled={!name.trim()}>
            Criar área
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
