export type Color = "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
export type Group = "todo" | "doing" | "done" | "review";
export type PropType = "status" | "select" | "multi" | "date" | "checkbox" | "number" | "text" | "url";
export type ViewType = "board" | "table" | "calendar";
export type PageType = "home" | "db" | "habits" | "calendar" | "todo";
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
/** Fixed fields every task has. Only their options (status columns, priorities, tags) can be edited. */
export const FIXED_PROPS = ["status", "date", "prio", "tags"] as const;

export interface Database {
  srs: boolean;
  props: Prop[];
  views: View[];
  /** Area given to new tasks in this database when no area is selected at the top. */
  defaultArea?: string;
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
/** Only used to read data saved before version 2 (block pages and block notes). */
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
  /** Free-text notes for the task. */
  notes: string;
  /** Minutes before the task's date/time when an e-mail alert is sent. */
  alerts?: number[];
  area?: string;
  /** Legacy (version 1). Converted into `notes` on load. */
  blocks?: Block[];
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
export type AreaColor = "coral" | "petrol" | "violet" | "amber" | "green" | "pink" | "sky" | "slate";
export interface Area {
  id: string;
  name: string;
  color: AreaColor;
}
export interface CalendarEvent {
  id: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  allDay: boolean;
  /** HH:MM, local time */
  start: string;
  end: string;
  area?: string;
  location: string;
  notes: string;
  /** Minutes before the start when an e-mail alert is sent. */
  alerts: number[];
  /** Repeats from `date` on; the series ends after `repeatUntil` (inclusive) when set. */
  repeat?: Repeat;
  repeatUntil?: string;
  created: number;
  updated: number;
}
export type Repeat = "none" | "daily" | "weekdays" | "weekly" | "monthly";
/** A quick to-do: just text, a checkbox and optionally a day and an area. */
export interface Todo {
  id: string;
  text: string;
  done: boolean;
  /** YYYY-MM-DD */
  date?: string;
  area?: string;
  order: number;
  created: number;
  doneAt?: number;
}
export interface Settings {
  theme: "system" | "light" | "dark";
  start: string;
  name: string;
  areas: Area[];
  /** Send e-mail alerts for events (needs an account). */
  emailAlerts: boolean;
  /** Alerts pre-selected for new events, in minutes before. */
  defaultAlerts: number[];
  /** Note folders created by the person, kept even while empty. */
  noteFolders?: string[];
}
export interface Workspace {
  version: 2;
  pages: Page[];
  dbs: Record<string, Database>;
  items: Record<string, Item>;
  events: Record<string, CalendarEvent>;
  todos: Record<string, Todo>;
  notes: Record<string, Note>;
  /** Legacy (version 1) block pages. Converted into notes on load. */
  docs?: Record<string, Block[]>;
  habits: Habit[];
  habitLog: Record<string, string[]>;
  settings: Settings;
}
