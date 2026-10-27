import { visibleProps } from "../../lib/model";
import { openPeek } from "../../store";
import { emptyText, type ViewProps } from "../DbPage";
import { PropDisplay } from "../Props";

export function ListView({ db, view, list, hasAny }: ViewProps) {
  const props = visibleProps(db, view);
  if (!list.length) return <div className="empty">{emptyText(hasAny)}</div>;
  return (
    <div className="list">
      {list.map((it) => (
        <div key={it.id} className="lrow" role="button" tabIndex={0} onClick={() => openPeek(it.id)} onKeyDown={(e) => { if (e.key === "Enter") openPeek(it.id); }}>
          <span className="ttl">{it.title || "Sem título"}</span>
          <span className="props">{props.map((p) => <PropDisplay key={p.id} prop={p} value={it.props[p.id]} item={it} db={db} />)}</span>
        </div>
      ))}
    </div>
  );
}
