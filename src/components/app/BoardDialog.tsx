import { useRef, useState } from "react";
import { addBoard, renamePage, setPageFolder, useStore } from "@/store";
import { boardFolderList } from "@/lib/notes";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AreaDot, useAreas } from "../common";
import { IconPicker } from "../IconPicker";
import { Glyph } from "../icons";
import { DEFAULT_LIST_ICON } from "@/lib/util";
import { Folder } from "lucide-react";

const NONE = "__none";

/** Create a task list (optionally inside `folder`), or edit one when `pageId` is given. */
export function BoardDialog({
  pageId,
  folder: startFolder = "",
  open,
  onOpenChange,
}: {
  pageId?: string;
  folder?: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const folders = boardFolderList(useStore((s) => s.ws));
  const nameRef = useRef<HTMLInputElement>(null);
  const page = useStore((s) => (pageId ? s.ws.pages.find((p) => p.id === pageId) : undefined));
  const db = useStore((s) => (pageId ? s.ws.dbs[pageId] : undefined));
  const areas = useAreas();
  const [title, setTitle] = useState(page?.title ?? "");
  const [icon, setIcon] = useState(page?.icon ?? DEFAULT_LIST_ICON);
  const [area, setArea] = useState(db?.defaultArea ?? "none");
  const [folder, setFolder] = useState(page ? page.folder || NONE : startFolder || NONE);
  const save = () => {
    const a = area === "none" ? undefined : area;
    const f = folder === NONE ? "" : folder;
    if (pageId) {
      renamePage(pageId, title, icon);
      setPageFolder(pageId, f);
      useStore.getState().mut((w) => {
        if (w.dbs[pageId]) w.dbs[pageId].defaultArea = a;
      });
    } else addBoard(title, icon, a, f);
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onOpenAutoFocus={(e) => {
          // Start in the name field (not the icon button), also when opened from a menu.
          e.preventDefault();
          nameRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{pageId ? "Editar lista" : "Nova lista de tarefas"}</DialogTitle>
          <DialogDescription>Cada lista tem seu próprio quadro com colunas de status.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="board-title">Nome</FieldLabel>
              <div className="flex gap-2">
                <IconPicker value={icon} onChange={setIcon} label="Ícone da lista">
                  <Button type="button" variant="outline" size="icon" aria-label="Ícone da lista" className="size-10 shrink-0">
                    <Glyph icon={icon} size="md" />
                  </Button>
                </IconPicker>
                <Input
                  id="board-title"
                  ref={nameRef}
                  autoComplete="off"
                  placeholder="Ex.: Casa, Faculdade, Projetos…"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            </Field>
            {folders.length > 0 && (
              <Field>
                <FieldLabel htmlFor="board-folder">Pasta</FieldLabel>
                <Select value={folder} onValueChange={setFolder}>
                  <SelectTrigger id="board-folder" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={NONE}>Sem pasta</SelectItem>
                      {folders.map((f) => (
                        <SelectItem key={f} value={f}>
                          <Folder className="text-primary-strong" aria-hidden="true" />
                          {f.split("/").join(" › ")}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="board-area">Área das tarefas novas</FieldLabel>
              <Select value={area} onValueChange={setArea}>
                <SelectTrigger id="board-area" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="none">Sem área</SelectItem>
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
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{pageId ? "Salvar" : "Criar lista"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
