import { Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Glyph, LUCIDE } from "../icons";

/** No icon chosen (or the old 📁 default): the drawn folder, closed or open. */
export const isDefaultFolderIcon = (icon?: string) => !icon || icon === "📁" || icon === "📂";

/** A folder's icon in the sidebar: the tinted drawn folder by default, or the icon/emoji chosen for it. */
export function FolderGlyph({ icon, open, className }: { icon?: string; open?: boolean; className?: string }) {
  if (icon?.startsWith(LUCIDE)) return <Glyph icon={icon} size="sm" className={className} />;
  if (isDefaultFolderIcon(icon)) {
    const Icon = open ? FolderOpen : Folder;
    return <Icon aria-hidden="true" className={cn("fill-primary/15 text-primary-strong", className)} />;
  }
  return <Glyph icon={icon} size="sm" className={className} />;
}
