import { useEffect, useState } from "react";
import type { Item, Note, Page } from "../lib/types";
import { deleteForever, loadTrash, restoreRows, type TrashRow } from "../lib/sync";
import { toast, useStore } from "../store";
import { Modal } from "./ui";

const SHOWN = new Set(["page", "item", "note"]);
const sameBatch = (a: string, b: string) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) < 3000;

export function Trash() {
  const setUi = useStore((s) => s.setUi);
  const ws = useStore((s) => s.ws);
  const [rows, setRows] = useState<TrashRow[] | null>(null);
  const [error, setError] = useState("");
  const close = () =>
    setUi((u) => {
      u.modal = null;
    });
  const reload = () =>
    loadTrash()
      .then(setRows)
      .catch(() => setError("Não foi possível carregar a lixeira. Verifique a conexão."));
  useEffect(() => {
    reload();
  }, []);

  // A page deleted together with its sub-pages and items shows as one entry; restoring it brings all of them back.
  const groupOf = (r: TrashRow) =>
    r.kind === "page"
      ? (rows ?? []).filter((x) => sameBatch(x.deleted_at, r.deleted_at) && (x.id === r.id || x.kind !== "note"))
      : [r];
  const visible = (rows ?? []).filter((r) => {
    if (!SHOWN.has(r.kind)) return false;
    if (r.kind === "page") {
      const parent = (r.data as Page).parent;
      return !(rows ?? []).some((x) => x.kind === "page" && x.id === parent && sameBatch(x.deleted_at, r.deleted_at));
    }
    if (r.kind === "item")
      return !(rows ?? []).some(
        (x) => x.kind === "page" && x.id === (r.data as Item).db && sameBatch(x.deleted_at, r.deleted_at),
      );
    return true;
  });
  const label = (r: TrashRow) => {
    if (r.kind === "page") {
      const p = r.data as Page;
      return `${p.icon} ${p.title || "Sem título"}`;
    }
    if (r.kind === "note") return "📓 " + ((r.data as Note).title || "Sem título");
    return (r.data as Item).title || "Sem título";
  };
  const where = (r: TrashRow) => {
    if (r.kind === "item") {
      const p = ws.pages.find((x) => x.id === (r.data as Item).db);
      return p ? `em ${p.title}` : "página excluída";
    }
    return r.kind === "page" ? "Página" : "Anotação";
  };
  const restore = (r: TrashRow) => {
    const group = groupOf(r);
    restoreRows(group);
    setRows((rs) => (rs ?? []).filter((x) => !group.includes(x)));
    toast("Restaurado: " + label(r));
  };
  const forget = async (r: TrashRow) => {
    const group = groupOf(r);
    await deleteForever(group);
    setRows((rs) => (rs ?? []).filter((x) => !group.includes(x)));
  };

  return (
    <Modal onClose={close}>
      <div className="modal-head">
        <h3>Lixeira</h3>
        <button className="iconbtn" aria-label="Fechar" onClick={close}>
          ✕
        </button>
      </div>
      <div className="modal-body">
        <p className="small muted" style={{ marginTop: 0 }}>
          Itens excluídos ficam aqui por 30 dias.
        </p>
        {error && (
          <p className="small" style={{ color: "var(--bad)" }}>
            {error}
          </p>
        )}
        {!rows && !error && <p className="muted">Carregando…</p>}
        {rows && !visible.length && <p className="muted">A lixeira está vazia.</p>}
        {visible.map((r) => {
          const orphan = r.kind === "item" && !ws.dbs[(r.data as Item).db];
          return (
            <div key={r.kind + r.id} className="trash-row">
              <div className="trash-main">
                <span className="ttl">{label(r)}</span>
                <span className="small muted">
                  {where(r)} · {new Date(r.deleted_at).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                </span>
              </div>
              <button
                className="btn small"
                disabled={orphan}
                title={orphan ? "Restaure a página deste item primeiro" : ""}
                onClick={() => restore(r)}
              >
                Restaurar
              </button>
              <button className="ghostbtn small" onClick={() => forget(r)}>
                Excluir para sempre
              </button>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
