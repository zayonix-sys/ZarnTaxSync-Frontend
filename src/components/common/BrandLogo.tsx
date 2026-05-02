import { ReceiptText } from "lucide-react";

import { cn } from "@/lib/utils";
import { env } from "@/lib/env";

interface BrandLogoProps {
  className?: string;
  collapsed?: boolean;
  size?: "sm" | "md";
}

export function BrandLogo({ className, collapsed, size = "md" }: BrandLogoProps) {
  const dim = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const text = size === "sm" ? "text-sm" : "text-base";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm",
          dim,
        )}
      >
        <ReceiptText className="h-4 w-4" strokeWidth={2.4} />
      </div>
      {!collapsed && (
        <div className="flex flex-col leading-none">
          <span className={cn("font-semibold tracking-tight", text)}>
            {env.VITE_APP_NAME}
          </span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            FBR Digital Invoicing
          </span>
        </div>
      )}
    </div>
  );
}
