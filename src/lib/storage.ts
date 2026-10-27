import { createJSONStorage } from "zustand/middleware";

/**
 * Where the workspace is persisted. Today: the browser's localStorage.
 * To add accounts later (e.g. Supabase or Firebase), replace this with an
 * adapter that implements getItem / setItem / removeItem against the backend.
 */
export const workspaceStorage = createJSONStorage(() => localStorage);
export const STORAGE_KEY = "minha-rotina";
