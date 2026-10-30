import { flushSync } from "react-dom";

/**
 * Runs a change so that things on screen glide to their new place (View Transitions): a card
 * moving to another column, a task changing order, an event moving to another day. Elements
 * that should glide carry a unique `view-transition-name` (see `vtName`). Browsers without
 * support, and people who prefer less motion, simply get the change at once.
 */
export function withMotion(change: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (!doc.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return change();
  doc.startViewTransition(() => flushSync(change));
}

/** A valid, unique view-transition-name for an element (ids may contain characters CSS doesn't allow). */
export const vtName = (prefix: string, id: string) => `${prefix}-${id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
