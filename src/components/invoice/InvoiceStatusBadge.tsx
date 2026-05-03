import { CheckCircle2, Clock, FileEdit, XCircle, Ban } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/api/invoices";

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  InvoiceStatus,
  {
    variant: React.ComponentProps<typeof Badge>["variant"];
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    pulse?: boolean;
  }
> = {
  Draft: { variant: "secondary", label: "Draft", icon: FileEdit },
  Pending: { variant: "warning", label: "Pending", icon: Clock, pulse: true },
  Submitted: { variant: "success", label: "Submitted", icon: CheckCircle2 },
  Failed: { variant: "destructive", label: "Failed", icon: XCircle },
  Cancelled: { variant: "outline", label: "Cancelled", icon: Ban },
};

export function InvoiceStatusBadge({ status, className }: InvoiceStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.Draft;
  const Icon = config.icon;
  return (
    <Badge
      variant={config.variant}
      className={cn(
        "gap-1 px-2 py-0.5",
        status === "Cancelled" && "line-through opacity-70",
        className,
      )}
    >
      <Icon className={cn("h-3 w-3", config.pulse && "animate-pulse")} />
      {config.label}
    </Badge>
  );
}
