import { useMemo } from "react";
import { renderNote } from "../notes/NoteReader";

/** A task's notes as formatted text (same Markdown look as the Anotações). Loaded only when shown. */
export default function TaskNotesPreview({ text }: { text: string }) {
  const html = useMemo(() => renderNote(text), [text]);
  return (
    <div
      className="note-read md min-h-24 rounded-xl border bg-card px-4 py-3 text-[15px]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
