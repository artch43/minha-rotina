import { useState } from "react";
import type { Settings as S } from "../lib/types";
import { ACCENTS } from "../lib/util";
import { useStore } from "../store";
import { Modal } from "./ui";

export function Settings() {
  const ws = useStore((s) => s.ws);
  const { mut, setUi } = useStore.getState();
  const st = ws.settings;
  const [name, setName] = useState(st.name);
  const set = <K extends keyof S>(k: K, v: S[K]) => mut((w) => { w.settings[k] = v; });
  const close = () => setUi((u) => { u.modal = null; });
  const seg = <K extends keyof S>(k: K, opts: [S[K], string][]) => (
    <div className="seg">
      {opts.map(([v, n]) => <button key={String(v)} className={st[k] === v ? "on" : ""} aria-pressed={st[k] === v} onClick={() => set(k, v)}>{n}</button>)}
    </div>
  );
  return (
    <Modal onClose={close}>
      <div className="modal-head"><h3>Configurações</h3><button className="iconbtn" aria-label="Fechar" onClick={close}>✕</button></div>
      <div className="modal-body">
        <div className="setrow"><label htmlFor="set-name">Seu nome</label>
          <input id="set-name" className="inp" value={name} placeholder="Como quer ser chamado?" onChange={(e) => setName(e.target.value)} onBlur={() => set("name", name.trim())} />
        </div>
        <div className="setrow"><label htmlFor="set-start">Abrir em</label>
          <select id="set-start" className="inp" value={st.start} onChange={(e) => set("start", e.target.value)}>
            {ws.pages.map((p) => <option key={p.id} value={p.id}>{p.icon} {p.title || "Sem título"}</option>)}
          </select>
        </div>
        <div className="setrow"><span>Tema</span>{seg("theme", [["system", "Sistema"], ["light", "Claro"], ["dark", "Escuro"]])}</div>
        <div className="setrow"><span>Cor de destaque</span>
          <div className="swatches" style={{ padding: 0 }}>
            {Object.entries(ACCENTS).map(([k, [c, n]]) => (
              <button key={k} className={"sw" + (st.accent === k ? " on" : "")} style={{ background: c, width: 28, height: 28 }} title={n} aria-label={n} onClick={() => set("accent", k)} />
            ))}
          </div>
        </div>
        <div className="setrow"><span>Fonte</span>{seg("font", [["sans", "Sem serifa"], ["serif", "Serifada"], ["mono", "Mono"]])}</div>
        <div className="setrow"><span>Largura da página</span>{seg("width", [["normal", "Normal"], ["wide", "Larga"]])}</div>
        <div className="setrow"><span>Densidade</span>{seg("density", [["comfy", "Confortável"], ["compact", "Compacta"]])}</div>
        <p className="small muted" style={{ marginTop: 14 }}>Seus dados ficam salvos neste navegador.</p>
      </div>
    </Modal>
  );
}
