import { useEffect, useState } from "react";
import type { CalendarEvent, Item, Note, Page, Todo } from "@/lib/types";
import { deleteForever, loadTrash, restoreRows, type TrashRow } from "@/lib/sync";
import { toast, useStore } from "@/store";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

const SHOWN = new Set(["page", "item", "note", "event", "todo"]);
const sameBatch = (a: string, b: string) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) < 3000;
const KIND: Record<string, string> = { page: "Lista", item: "Tarefa", note: "Anotação", event: "Evento", todo: "Afazer" };

export function Trash() {
  const setUi = useStore((s) => s.setUi);
  const ws = useStore((s) => s.ws);
  const [rows, setRows] = useState<TrashRow[] | null>(null);
  const [error, setError] = useState("");
  const close = () =>
    setUi((u) => {
      u.modal = null;
    });
  useEffect(() => {
    loadTrash()
      .then(setRows)
      .catch(() => setError("Não foi possível abrir a lixeira. Verifique a conexão."));
  }, []);

  // A list deleted with its tasks shows as one entry; restoring it brings all of them back.
  const groupOf = (r: TrashRow) =>
    r.kind === "page"
      ? (rows ?? []).filter(
          (x) => sameBatch(x.deleted_at, r.deleted_at) && (x.id === r.id || x.kind === "item" || x.kind === "db"),
        )
      : [r];
  const visible = (rows ?? []).filter((r) => {
    if (!SHOWN.has(r.kind)) return false;
    if (r.kind === "item")
      return !(rows ?? []).some(
        (x) => x.kind === "page" && x.id === (r.data as Item).db && sameBatch(x.deleted_at, r.deleted_at),
      );
    return true;
  });
  const label = (r: TrashRow) => {
    const d = r.data as Partial<Page & Note & CalendarEvent & Todo & Item>;
    if (r.kind === "page") return `${d.icon} ${d.title || "Sem título"}`;
    if (r.kind === "todo") return d.text || "Afazer";
    return d.title || "Sem título";
  };
  const where = (r: TrashRow) =>
    r.kind === "item"
      ? `Tarefa em ${ws.pages.find((x) => x.id === (r.data as Item).db)?.title ?? "lista excluída"}`
      : KIND[r.kind];
  const drop = (group: TrashRow[]) => setRows((rs) => (rs ?? []).filter((x) => !group.includes(x)));

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Lixeira</DialogTitle>
          <DialogDescription>O que você exclui fica aqui por 30 dias.</DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!rows && !error && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        )}
        {rows && !visible.length && (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>A lixeira está vazia</EmptyTitle>
              <EmptyDescription>Nada foi excluído nos últimos 30 dias.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        <div className="flex flex-col divide-y">
          {visible.map((r) => {
            const orphan = r.kind === "item" && !ws.dbs[(r.data as Item).db];
            return (
              <div key={r.kind + r.id} className="flex flex-wrap items-center gap-2 py-3">
                <div className="flex min-w-44 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{label(r)}</span>
                  <span className="text-xs text-muted-foreground">
                    {where(r)} · excluído em{" "}
                    {new Date(r.deleted_at).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={orphan}
                  title={orphan ? "Restaure primeiro a lista desta tarefa" : undefined}
                  onClick={() => {
                    const g = groupOf(r);
                    restoreRows(g);
                    drop(g);
                    toast(`Restaurado: ${label(r)}`);
                  }}
                >
                  Restaurar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={async () => {
                    const g = groupOf(r);
                    await deleteForever(g);
                    drop(g);
                  }}
                >
                  Excluir para sempre
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
