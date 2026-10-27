export type Color = "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
export type Group = "todo" | "doing" | "done" | "review";
export type PropType = "status" | "select" | "multi" | "date" | "checkbox" | "number" | "text" | "url";
export type ViewType = "board" | "table" | "list" | "calendar";
export type PageType = "home" | "db" | "doc" | "habits";
export type BlockType = "p" | "h1" | "h2" | "h3" | "ul" | "ol" | "todo" | "quote" | "callout" | "divider";

export interface Option {
  id: string;
  name: string;
  color: Color;
  group?: Group;
}
export interface Prop {
  id: string;
  name: string;
  type: PropType;
  options?: Option[];
}
export interface Filter {
  prop: string;
  op: "is" | "isnot" | "contains";
  val: string;
}
export interface Sort {
  prop: string;
  dir: "asc" | "desc";
}
export interface View {
  id: string;
  name: string;
  type: ViewType;
  filters: Filter[];
  hidden: string[];
  sort?: Sort | null;
  widths?: Record<string, number>;
}
export interface Database {
  srs: boolean;
  props: Prop[];
  views: View[];
}
export interface Page {
  id: string;
  title: string;
  icon: string;
  type: PageType;
  parent: string | null;
  order: number;
  cover?: string;
  fav?: boolean;
}
export interface Block {
  id: string;
  type: BlockType;
  text: string;
  checked?: boolean;
}
export type PropValue = string | number | boolean | string[];
export interface Review {
  stage: number;
  next: string | null;
  finished?: boolean;
}
export interface Item {
  id: string;
  db: string;
  title: string;
  props: Record<string, PropValue>;
  blocks: Block[];
  created: number;
  updated: number;
  order: number;
  log: { g: Group | null; t: number }[];
  review?: Review;
}
export interface Note {
  id: string;
  title: string;
  folder: string;
  body: string;
  created: number;
  updated: number;
  pinned?: boolean;
}
export interface Habit {
  id: string;
  name: string;
  icon: string;
  order?: number;
}
export interface Settings {
  theme: "system" | "light" | "dark";
  accent: string;
  font: "sans" | "serif" | "mono";
  width: "normal" | "wide";
  density: "comfy" | "compact";
  start: string;
  name: string;
  /** Note folders created by the person, kept even while empty. */
  noteFolders?: string[];
}
export interface Workspace {
  version: 1;
  pages: Page[];
  dbs: Record<string, Database>;
  items: Record<string, Item>;
  docs: Record<string, Block[]>;
  notes: Record<string, Note>;
  habits: Habit[];
  habitLog: Record<string, string[]>;
  settings: Settings;
}
