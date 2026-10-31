import { useEffect, useRef } from "react";

/**
 * The phone's (and browser's) Back button closes what is open — the menu, a dialog, the task panel —
 * instead of leaving the site. Each open layer adds a history entry with the same address; Back
 * removes it and closes the top layer. Closing by X, Esc or a tap outside takes the entry away again.
 */
const layers: { token: number; close: () => void }[] = [];
/** Layers just closed by X/Esc whose entry is about to be taken away (token → timer). */
const closing = new Map<number, number>();
let skip = 0;
let next = 1;
const overlayToken = () => (history.state as { overlay?: number } | null)?.overlay;

/**
 * Goes to another page of the app. Over an open layer's entry (a link in the menu, say), that entry
 * becomes the page, so Back doesn't stop on an empty step first.
 */
export function pushRoute(hash: string) {
  if (location.hash === hash) return;
  if (overlayToken()) {
    const t = overlayToken()!;
    clearTimeout(closing.get(t));
    closing.delete(t);
    history.replaceState(null, "", hash);
    // The page change below it isn't a "Back": the layer just closes normally.
    const i = layers.findIndex((l) => l.token === t);
    if (i >= 0) layers.splice(i, 1);
  } else history.pushState(null, "", hash);
}

if (typeof window !== "undefined")
  addEventListener("popstate", () => {
    if (skip) {
      skip--;
      return;
    }
    // Only when Back landed below the top layer's entry (not on a page change made elsewhere).
    const top = layers[layers.length - 1];
    if (top && overlayToken() !== top.token) {
      layers.pop();
      top.close();
    }
  });

export function useBackToClose(open: boolean, close: () => void) {
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    if (!open) return;
    const token = next++;
    const layer = { token, close: () => closeRef.current() };
    // Another layer closed in the same moment (the menu, when a window opens from it): take its entry.
    const reuse = overlayToken();
    if (reuse && closing.has(reuse)) {
      clearTimeout(closing.get(reuse));
      closing.delete(reuse);
      history.replaceState({ overlay: token }, "");
    } else history.pushState({ overlay: token }, "");
    layers.push(layer);
    return () => {
      const i = layers.indexOf(layer);
      if (i < 0) return; // closed by Back: its entry is already gone
      layers.splice(i, 1);
      // Closed some other way: drop the entry, unless something already navigated on top of it.
      closing.set(
        token,
        window.setTimeout(() => {
          closing.delete(token);
          if (overlayToken() === token) {
            skip++;
            history.back();
          }
        }, 0),
      );
    };
  }, [open]);
}
