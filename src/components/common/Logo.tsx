import { ReceiptText } from "lucide-react";

import { cn } from "@/lib/utils";
import { env } from "@/lib/env";

interface LogoProps {
  collapsed?: boolean;
  className?: string;
}

export function Logo({ collapsed, className }: LogoProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 font-semibold tracking-tight",
        className,
      )}
    >
      <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground shadow-sm">
        <ReceiptText className="h-[18px] w-[18px]" />
      </span>
      {!collapsed && (
        <span className="text-base leading-none">
          <span className="text-foreground">{env.VITE_APP_NAME}</span>
        </span>
      )}
    </div>
  );
}
