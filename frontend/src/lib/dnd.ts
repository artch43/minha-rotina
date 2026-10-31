/** The task card being dragged right now (so a list in the sidebar can take it). */
export const TASK_MIME = "application/x-organizer-task";
let dragged: string | null = null;
export const draggedTask = () => dragged;
export const setDraggedTask = (id: string | null) => {
  dragged = id;
};
