/** The task card being dragged right now (so the sidebar lists can accept it as a copy). */
export const TASK_MIME = "application/x-minha-rotina-task";
let dragged: string | null = null;
export const draggedTask = () => dragged;
export const setDraggedTask = (id: string | null) => {
  dragged = id;
};
