import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { passwordRules } from "@/lib/password";

/** The new-password requirements, ticked off live as the person types. */
export function PasswordRules({ value, className, ...rest }: { value: string } & React.HTMLAttributes<HTMLUListElement>) {
  return (
    <ul {...rest} className={cn("flex flex-wrap gap-x-4 gap-y-1 text-sm", className)} aria-label="Requisitos da senha">
      {passwordRules(value).map((r) => (
        <li
          key={r.label}
          className={cn("flex items-center gap-1.5 transition-colors", r.ok ? "text-success" : "text-muted-foreground")}
        >
          {r.ok ? <Check className="size-4" aria-hidden="true" /> : <Circle className="size-3" aria-hidden="true" />}
          <span>
            {r.label}
            <span className="sr-only">{r.ok ? " (ok)" : " (falta)"}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
