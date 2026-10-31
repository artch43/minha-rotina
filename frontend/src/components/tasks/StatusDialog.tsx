import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import type { Group } from "@/lib/types";
import { statusProp } from "@/lib/model";
import { GROUPS } from "@/lib/util";
import { addStatus, deleteStatus, moveStatus, renameStatus, setStatusColor, setStatusGroup, useStore } from "@/store";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TagSwatches } from "../common";

/** Rename, recolor, reorder, add and remove the status columns of one list. */
export function StatusDialog() {
  const dbId = useStore((s) => s.ui.statusDialog);
  const db = useStore((s) => (dbId ? s.ws.dbs[dbId] : undefined));
  const page = useStore((s) => s.ws.pages.find((p) => p.id === dbId));
  const setUi = useStore((s) => s.setUi);
  const close = () =>
    setUi((u) => {
      u.statusDialog = null;
    });
  const options = db ? (statusProp(db)?.options ?? []) : [];
  return (
    <Dialog open={!!db} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar status{page ? ` de ${page.title}` : ""}</DialogTitle>
          <DialogDescription>
            Cada status é uma coluna do quadro. “Conta como” diz ao Início o que significa cada um.
          </DialogDescription>
        </DialogHeader>
        <div className="flex max-h-[55vh] flex-col gap-2 overflow-y-auto pr-1">
          {dbId &&
            options.map((o, i) => (
              <div key={o.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      aria-label={`Cor de ${o.name}`}
                      data-color={o.color}
                      className="swatch-color size-7 shrink-0 rounded-full ring-offset-2 ring-offset-background hover:ring-2 hover:ring-border"
                    />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto">
                    <TagSwatches value={o.color} onChange={(c) => setStatusColor(dbId, o.id, c)} />
                  </PopoverContent>
                </Popover>
                <Input
                  key={o.name}
                  defaultValue={o.name}
                  aria-label="Nome do status"
                  className="min-w-32 flex-1"
                  onBlur={(e) => renameStatus(dbId, o.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                />
                <Select value={o.group ?? "todo"} onValueChange={(g) => setStatusGroup(dbId, o.id, g as Group)}>
                  <SelectTrigger aria-label="Conta como" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {(Object.entries(GROUPS) as [Group, string][]).map(([g, n]) => (
                        <SelectItem key={g} value={g}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <div className="flex">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Subir"
                    disabled={i === 0}
                    onClick={() => moveStatus(dbId, o.id, -1)}
                  >
                    <ChevronUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Descer"
                    disabled={i === options.length - 1}
                    onClick={() => moveStatus(dbId, o.id, 1)}
                  >
                    <ChevronDown />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Excluir ${o.name}`}
                    disabled={options.length <= 1}
                    onClick={() => deleteStatus(dbId, o.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
        </div>
        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={() => dbId && addStatus(dbId)}>
            <Plus data-icon="inline-start" />
            Novo status
          </Button>
          <Button onClick={close}>Pronto</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
