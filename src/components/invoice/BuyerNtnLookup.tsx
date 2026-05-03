import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useRegistrationCheck, useStatlCheck } from "@/hooks/useReference";
import { cn } from "@/lib/utils";

interface BuyerNtnLookupProps {
  /** Buyer NTN/CNIC (digits only). */
  value: string;
  /** Invoice date (yyyy-MM-dd) — required for SATL check. */
  invoiceDate: string;
  /**
   * Called when the FBR registration-type lookup disagrees with the user's
   * radio selection — Phase 4 plan says auto-correct.
   */
  onRegistrationMismatch?: (serverType: "Registered" | "Unregistered") => void;
}

/**
 * Debounced parallel checks against /reference/registration-type and /reference/statl.
 * Spinner while either is in-flight; inline badges for results; warning if not in SATL.
 */
export function BuyerNtnLookup({
  value,
  invoiceDate,
  onRegistrationMismatch,
}: BuyerNtnLookupProps) {
  const [debounced, setDebounced] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = value.replace(/\D/g, "");
    if (trimmed.length < 7) {
      setDebounced(null);
      return;
    }
    const handle = setTimeout(() => setDebounced(trimmed), 400);
    return () => clearTimeout(handle);
  }, [value]);

  const reg = useRegistrationCheck(debounced);
  const statl = useStatlCheck(debounced, invoiceDate);

  useEffect(() => {
    if (reg.data && onRegistrationMismatch) {
      onRegistrationMismatch(reg.data.registrationType);
    }
  }, [reg.data, onRegistrationMismatch]);

  if (!debounced) return null;

  const loading = reg.isFetching || statl.isFetching;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {loading && (
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Checking FBR…
        </span>
      )}
      {reg.data && (
        <Badge
          variant={reg.data.isRegistered ? "success" : "secondary"}
          className="gap-1"
        >
          <CheckCircle2 className="h-3 w-3" />
          {reg.data.registrationType}
        </Badge>
      )}
      {reg.error && (
        <Badge variant="outline" className="text-muted-foreground">
          Registration check unavailable
        </Badge>
      )}
      {statl.data && !statl.data.isActive && (
        <Badge variant="warning" className={cn("gap-1")}>
          <AlertTriangle className="h-3 w-3" />
          Not in SATL active taxpayer list
        </Badge>
      )}
      {statl.data?.isActive && (
        <Badge variant="success" className="gap-1">
          STATL active
        </Badge>
      )}
    </div>
  );
}
