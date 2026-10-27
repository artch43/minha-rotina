import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { applyRecords, diffEntities, fromRecords, keyOf, toEntities, type Ent, type Kind, type Rec } from "./records";
import { normalizeWorkspace } from "./backup";
import { template } from "./template";
import type { Workspace } from "./types";
import { STORAGE_KEY } from "./storage";
import { useStore } from "../store";

/**
 * Cloud sync. The Zustand store stays the source of truth for the UI (and is cached
 * per user in localStorage). Every change is diffed into per-entity rows and pushed to
 * Supabase in small batches; changes from other devices are pulled on focus and every minute.
 */

export type SyncStatus = "idle" | "saving" | "saved" | "offline" | "error";
export type Phase = "auth" | "loading" | "choose" | "ready";

interface SyncState {
  phase: Phase;
  status: SyncStatus;
  user: { id: string; email: string } | null;
  /** Data found in this browser from before the account existed, offered on first login. */
  candidate: Workspace | null;
  recovery: boolean;
}
export const useSync = create<SyncState>(() => ({ phase: "auth", status: "idle", user: null, candidate: null, recovery: false }));
const setStatus = (status: SyncStatus) => useSync.setState({ status });

const TABLE = "records";
const EPOCH = "1970-01-01T00:00:00Z";
const PURGE_DAYS = 30;

let uid = "";
let prev = new Map<string, Ent>();
let applying = false;
let pending = new Map<string, Rec>();
let lastSync = EPOCH;
let flushTimer: number | undefined;
let flushing = false;
let unsubscribe: (() => void) | null = null;
let pollTimer: number | undefined;

const cacheKey = () => STORAGE_KEY + ":" + uid;
const metaKey = () => STORAGE_KEY + ":sync:" + uid;
function saveMeta() {
  try {
    localStorage.setItem(metaKey(), JSON.stringify({ lastSync, pending: [...pending.values()] }));
  } catch {
    /* storage full or blocked */
  }
}
function loadMeta(): { lastSync: string; pending: Rec[] } {
  try {
    return JSON.parse(localStorage.getItem(metaKey()) || "null") ?? { lastSync: EPOCH, pending: [] };
  } catch {
    return { lastSync: EPOCH, pending: [] };
  }
}

/** Replace the workspace without pushing it back (it came from the server). */
function applyQuietly(fn: (ws: Workspace) => void) {
  applying = true;
  try {
    useStore.getState().mut(fn);
  } finally {
    applying = false;
    prev = toEntities(useStore.getState().ws);
  }
}

function onStoreChange(ws: Workspace) {
  const next = toEntities(ws);
  if (applying) {
    prev = next;
    return;
  }
  const { changed, removed } = diffEntities(prev, next);
  if (!changed.length && !removed.length) return;
  const now = new Date().toISOString();
  for (const k of changed) {
    const e = next.get(k)!;
    pending.set(k, { kind: e.kind, id: e.id, data: e.data, deleted_at: null });
  }
  for (const k of removed) {
    const e = prev.get(k)!;
    pending.set(k, { kind: e.kind, id: e.id, data: e.data, deleted_at: now });
  }
  prev = next;
  saveMeta();
  setStatus("saving");
  clearTimeout(flushTimer);
  flushTimer = window.setTimeout(flush, 800);
}

export async function flush() {
  if (!supabase || !uid || flushing || !pending.size) return;
  flushing = true;
  const batch = [...pending.entries()];
  pending = new Map();
  try {
    for (let i = 0; i < batch.length; i += 500) {
      const rows = batch
        .slice(i, i + 500)
        .map(([, r]) => ({ user_id: uid, kind: r.kind, id: r.id, data: r.data, deleted_at: r.deleted_at ?? null }));
      const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: "user_id,kind,id" });
      if (error) throw error;
    }
    setStatus(pending.size ? "saving" : "saved");
  } catch {
    // Keep anything that failed, unless a newer change for the same entity arrived meanwhile.
    for (const [k, r] of batch) if (!pending.has(k)) pending.set(k, r);
    setStatus(navigator.onLine ? "error" : "offline");
    clearTimeout(flushTimer);
    flushTimer = window.setTimeout(flush, 10_000);
  } finally {
    flushing = false;
    saveMeta();
    if (pending.size && useSync.getState().status === "saving") {
      clearTimeout(flushTimer);
      flushTimer = window.setTimeout(flush, 800);
    }
  }
}

async function fetchSince(since: string): Promise<Rec[]> {
  const out: Rec[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase!
      .from(TABLE)
      .select("kind,id,data,updated_at,deleted_at")
      .gte("updated_at", since)
      .order("updated_at", { ascending: true })
      .range(from, from + 999);
    if (error) throw error;
    out.push(...(data as Rec[]));
    if (!data || data.length < 1000) return out;
  }
}

export async function pull() {
  if (!supabase || !uid || useSync.getState().phase !== "ready") return;
  try {
    const rows = (await fetchSince(lastSync)).filter((r) => !pending.has(keyOf(r.kind, r.id)));
    if (rows.length) applyQuietly((ws) => applyRecords(ws, rows));
    advance(rows);
  } catch {
    setStatus(navigator.onLine ? "error" : "offline");
  }
}
function advance(rows: Rec[]) {
  for (const r of rows) if (r.updated_at && r.updated_at > lastSync) lastSync = r.updated_at;
  saveMeta();
}

/** Called once a session exists. Loads the person's workspace and starts syncing. */
export async function startCloud(user: User) {
  if (!supabase) return;
  if (uid === user.id && useSync.getState().phase === "ready") return;
  uid = user.id;
  useSync.setState({ user: { id: user.id, email: user.email ?? "" }, phase: "loading" });

  // Point the local cache at this person's own key.
  const legacy = localStorage.getItem(STORAGE_KEY);
  const hadCache = !!localStorage.getItem(cacheKey());
  useStore.persist.setOptions({ name: cacheKey() });
  if (hadCache) await useStore.persist.rehydrate();

  const meta = hadCache ? loadMeta() : { lastSync: EPOCH, pending: [] };
  lastSync = meta.lastSync;
  pending = new Map(meta.pending.map((r) => [keyOf(r.kind, r.id), r]));

  let rows: Rec[];
  try {
    rows = await fetchSince(lastSync);
  } catch {
    if (!hadCache) {
      useSync.setState({ phase: "auth", user: null });
      throw new Error("Não foi possível carregar seus dados. Verifique a conexão e tente de novo.");
    }
    rows = [];
    setStatus("offline");
  }

  if (!hadCache) {
    if (rows.length === 0) {
      // Brand-new account: offer the data this browser already has, if any.
      const candidate = parseLegacy(legacy);
      if (candidate) {
        useSync.setState({ phase: "choose", candidate });
        return;
      }
      seedAccount(template());
      return;
    }
    applyQuietly((ws) => {
      Object.assign(ws, fromRecords(rows, ws.settings));
    });
  } else {
    const fresh = rows.filter((r) => !pending.has(keyOf(r.kind, r.id)));
    if (fresh.length) applyQuietly((ws) => applyRecords(ws, fresh));
  }
  advance(rows);
  begin();
}

function parseLegacy(raw: string | null): Workspace | null {
  try {
    const ws = JSON.parse(raw || "null")?.state?.ws as Workspace | undefined;
    return ws && Array.isArray(ws.pages) ? normalizeWorkspace(ws) : null;
  } catch {
    return null;
  }
}

/** First login: upload either the browser's existing data or a fresh starter workspace. */
export function seedAccount(ws: Workspace) {
  prev = new Map();
  applying = true;
  useStore.getState().mut((w) => {
    Object.assign(w, ws);
  });
  applying = false;
  useStore.getState().setUi((u) => {
    u.route = "home";
    u.peek = null;
  });
  // Treat everything as new so it all gets uploaded.
  onStoreChange(useStore.getState().ws);
  useSync.setState({ candidate: null });
  begin();
}

function begin() {
  prev = toEntities(useStore.getState().ws);
  unsubscribe?.();
  unsubscribe = useStore.subscribe((s, old) => {
    if (s.ws !== old.ws) onStoreChange(s.ws);
  });
  useSync.setState({ phase: "ready", status: pending.size ? "saving" : "saved" });
  flush();
  purgeOld();
  clearInterval(pollTimer);
  pollTimer = window.setInterval(() => {
    if (!document.hidden) pull();
  }, 60_000);
}

export async function signOut() {
  await flush();
  try {
    localStorage.removeItem(cacheKey());
    localStorage.removeItem(metaKey());
  } catch {
    /* ignore */
  }
  await supabase?.auth.signOut();
  location.hash = "";
  location.reload();
}

if (typeof window !== "undefined") {
  addEventListener("online", () => {
    flush();
    pull();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) pull();
    else flush();
  });
  addEventListener("beforeunload", () => saveMeta());
}

/* ---------- trash ---------- */
export interface TrashRow extends Rec {
  deleted_at: string;
}

async function purgeOld() {
  const cutoff = new Date(Date.now() - PURGE_DAYS * 864e5).toISOString();
  await supabase?.from(TABLE).delete().lt("deleted_at", cutoff);
}
export async function loadTrash(): Promise<TrashRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(TABLE)
    .select("kind,id,data,updated_at,deleted_at")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })
    .limit(1000);
  if (error) throw error;
  return data as TrashRow[];
}
/** Restores rows by putting them back into the workspace; the normal sync then uploads them. */
export function restoreRows(rows: Rec[]) {
  useStore.getState().mut((ws) =>
    applyRecords(
      ws,
      rows.map((r) => ({ ...r, deleted_at: null })),
    ),
  );
}
export async function deleteForever(rows: { kind: Kind; id: string }[]) {
  if (!supabase) return;
  for (const r of rows) await supabase.from(TABLE).delete().eq("kind", r.kind).eq("id", r.id).not("deleted_at", "is", null);
}
