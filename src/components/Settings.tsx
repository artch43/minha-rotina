import { useState } from "react";
import { Download, LogOut, Plus, Trash2, Upload } from "lucide-react";
import type { AreaColor, Settings as S, Workspace } from "@/lib/types";
import { WhatsAppNumber } from "./calendar/AlertPicker";
import { ALERT_PRESETS } from "@/lib/events";
import { downloadBackup, parseBackup } from "@/lib/backup";
import { cloudEnabled } from "@/lib/supabase";
import { deleteAllMyData, signOut, useSync } from "@/lib/sync";
import { addArea, deleteArea, notify, replaceWorkspace, toast, updateArea, useStore } from "@/store";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AreaSwatches, areaVar, useAreas } from "./common";
import { Glyph } from "./icons";
import { AppearanceTab } from "./AppearanceTab";

export function Settings() {
  const ws = useStore((s) => s.ws);
  const setUi = useStore((s) => s.setUi);
  const mut = useStore((s) => s.mut);
  const st = ws.settings;
  const set = <K extends keyof S>(k: K, v: S[K]) =>
    mut((w) => {
      w.settings[k] = v;
    });
  const close = () =>
    setUi((u) => {
      u.modal = null;
    });
  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Configurações</DialogTitle>
          <DialogDescription>Ajuste o site do seu jeito.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="geral" className="gap-5">
          <TabsList className="w-full">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="aparencia">Aparência</TabsTrigger>
            <TabsTrigger value="areas">Áreas</TabsTrigger>
            <TabsTrigger value="alertas">Alertas</TabsTrigger>
            <TabsTrigger value="conta">Conta</TabsTrigger>
          </TabsList>

          <TabsContent value="geral">
            <FieldGroup>
              <NameField value={st.name} onSave={(v) => set("name", v)} />
              <Field>
                <FieldLabel htmlFor="set-start">Abrir em</FieldLabel>
                <Select value={st.start} onValueChange={(v) => set("start", v)}>
                  <SelectTrigger id="set-start" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {ws.pages.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <Glyph icon={p.icon} size="xs" />
                          {p.title}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <p className="text-sm text-muted-foreground">Tema, cores e papel de parede ficam em Aparência.</p>
            </FieldGroup>
          </TabsContent>

          <TabsContent value="aparencia">
            <AppearanceTab />
          </TabsContent>

          <TabsContent value="areas">
            <AreasTab />
          </TabsContent>

          <TabsContent value="alertas">
            <FieldGroup>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor="set-email">Avisos de eventos e tarefas</FieldLabel>
                  <FieldDescription>
                    {cloudEnabled
                      ? "Chegam no e-mail da sua conta ou no WhatsApp, conforme você escolher em cada evento ou tarefa."
                      : "Precisa de uma conta. Com o site salvando só neste navegador, nenhum aviso é enviado."}
                  </FieldDescription>
                </FieldContent>
                <Switch id="set-email" checked={st.emailAlerts} onCheckedChange={(v) => set("emailAlerts", v)} />
              </Field>
              <FieldSeparator />
              <Field>
                <FieldLabel>Número do WhatsApp</FieldLabel>
                <FieldDescription>Usado nos avisos marcados como WhatsApp.</FieldDescription>
                <WhatsAppNumber phone={st.whatsapp} />
              </Field>
              <FieldSeparator />
              <FieldSet>
                <FieldLegend variant="label">Alertas já marcados em eventos novos</FieldLegend>
                <ToggleGroup
                  type="multiple"
                  variant="outline"
                  size="sm"
                  spacing={2}
                  className="flex-wrap"
                  value={st.defaultAlerts.map(String)}
                  onValueChange={(v) =>
                    set(
                      "defaultAlerts",
                      v.map(Number).sort((a, b) => a - b),
                    )
                  }
                >
                  {ALERT_PRESETS.map((p) => (
                    <ToggleGroupItem key={p.minutes} value={String(p.minutes)} className="px-2.5">
                      {p.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </FieldSet>
            </FieldGroup>
          </TabsContent>

          <TabsContent value="conta">
            <AccountTab onClose={close} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function NameField({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  return (
    <Field>
      <FieldLabel htmlFor="set-name">Seu nome</FieldLabel>
      <Input
        id="set-name"
        placeholder="Como quer ser chamado?"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => onSave(v.trim())}
      />
      <FieldDescription>Aparece na saudação do Início.</FieldDescription>
    </Field>
  );
}

function AreasTab() {
  const areas = useAreas();
  const [name, setName] = useState("");
  const [color, setColor] = useState<AreaColor>("amber");
  const create = () => {
    if (!name.trim()) return;
    addArea(name, color);
    setName("");
  };
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        As áreas separam suas tarefas e eventos (por exemplo, pessoal e profissional). Escolha uma no topo da tela para
        ver só o que é dela.
      </p>
      {areas.map((a) => (
        <div key={a.id} style={areaVar(a)} className="area-stripe flex flex-col gap-3 rounded-lg border py-3 pr-3 pl-5">
          <div className="flex gap-2">
            <Input
              key={a.name}
              aria-label="Nome da área"
              defaultValue={a.name}
              onBlur={(e) => e.target.value.trim() && updateArea(a.id, { name: e.target.value.trim() })}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Excluir ${a.name}`}
              disabled={areas.length <= 1}
              onClick={() => {
                deleteArea(a.id);
                toast(`Área “${a.name}” excluída. Os itens dela ficaram sem área.`);
              }}
            >
              <Trash2 />
            </Button>
          </div>
          <AreaSwatches value={a.color} onChange={(c) => updateArea(a.id, { color: c })} />
        </div>
      ))}
      <div className="flex flex-col gap-3 rounded-lg border border-dashed p-3">
        <div className="flex gap-2">
          <Input
            aria-label="Nome da nova área"
            placeholder="Nova área, ex.: Saúde…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") create();
            }}
          />
          <Button onClick={create} disabled={!name.trim()}>
            <Plus data-icon="inline-start" />
            Criar
          </Button>
        </div>
        <AreaSwatches value={color} onChange={setColor} />
      </div>
    </div>
  );
}

function AccountTab({ onClose }: { onClose: () => void }) {
  const user = useSync((s) => s.user);
  const [pending, setPending] = useState<Workspace | null>(null);
  const [err, setErr] = useState("");
  const [confirm, setConfirm] = useState("");
  const onFile = async (f?: File) => {
    setErr("");
    setPending(null);
    if (!f) return;
    try {
      setPending(parseBackup(await f.text()));
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  return (
    <FieldGroup>
      {cloudEnabled ? (
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel>Conta</FieldLabel>
            <FieldDescription>
              Conectado como <b className="text-foreground">{user?.email}</b>. Seus dados ficam salvos na nuvem.
            </FieldDescription>
          </FieldContent>
          <Button
            variant="outline"
            onClick={() =>
              signOut().catch((e: Error) =>
                notify(e.message, { label: "Sair e descartar", onClick: () => void signOut(true) }),
              )
            }
          >
            <LogOut data-icon="inline-start" />
            Sair
          </Button>
        </Field>
      ) : (
        <Alert>
          <AlertTitle>Sem conta</AlertTitle>
          <AlertDescription>Seus dados ficam salvos apenas neste navegador. Baixe um backup de vez em quando.</AlertDescription>
        </Alert>
      )}
      <FieldSeparator />
      <Field>
        <FieldLabel>Backup</FieldLabel>
        <FieldDescription>Uma cópia de tudo: listas, tarefas, eventos, anotações e hábitos.</FieldDescription>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => downloadBackup(useStore.getState().ws)}>
            <Download data-icon="inline-start" />
            Baixar backup
          </Button>
          <Button variant="outline" asChild>
            <label htmlFor="backup-file" className="cursor-pointer">
              <Upload data-icon="inline-start" />
              Restaurar backup
            </label>
          </Button>
          <input
            id="backup-file"
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        {pending && (
          <Alert>
            <AlertTitle>Substituir tudo pelo backup?</AlertTitle>
            <AlertDescription className="flex flex-col gap-3">
              {pending.pages.length} páginas e {Object.keys(pending.items).length} tarefas. O que está no site agora será trocado.
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    replaceWorkspace(pending);
                    setPending(null);
                    onClose();
                    toast("Backup restaurado");
                  }}
                >
                  Substituir
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPending(null)}>
                  Cancelar
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </Field>
      {cloudEnabled && (
        <>
          <FieldSeparator />
          <Field>
            <FieldLabel htmlFor="erase">Apagar todos os meus dados</FieldLabel>
            <FieldDescription>
              Apaga para sempre tudo o que está na nuvem e sai da conta. Digite APAGAR para confirmar.
            </FieldDescription>
            <div className="flex gap-2">
              <Input id="erase" className="max-w-40" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              <Button
                variant="destructive"
                disabled={confirm.trim().toUpperCase() !== "APAGAR"}
                onClick={() => deleteAllMyData().catch((e: Error) => setErr(e.message))}
              >
                Apagar tudo
              </Button>
            </div>
          </Field>
        </>
      )}
      <p className="text-xs text-muted-foreground">
        <a className="underline underline-offset-2" href="/privacidade.html" target="_blank" rel="noopener">
          Privacidade e termos de uso
        </a>
      </p>
    </FieldGroup>
  );
}
