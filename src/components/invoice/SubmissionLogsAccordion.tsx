import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubmissionLogs } from "@/hooks/useInvoices";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface SubmissionLogsAccordionProps {
  invoiceId: string;
}

export function SubmissionLogsAccordion({ invoiceId }: SubmissionLogsAccordionProps) {
  const { data: logs, isLoading } = useSubmissionLogs(invoiceId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submission history</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !logs || logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No submission attempts yet.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {logs.map((log) => (
              <LogRow
                key={log.id}
                attempt={log.attemptNumber}
                httpStatus={log.httpStatusCode}
                attemptedAt={log.attemptedAt}
                requestPayload={log.requestPayloadJson}
                responsePayload={log.responsePayloadJson}
                fbrErrorCode={log.fbrErrorCode}
                fbrErrorMessage={log.fbrErrorMessage}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

interface LogRowProps {
  attempt: number;
  httpStatus: number;
  attemptedAt: string;
  requestPayload: string;
  responsePayload: string;
  fbrErrorCode?: string;
  fbrErrorMessage?: string;
}

function LogRow({
  attempt,
  httpStatus,
  attemptedAt,
  requestPayload,
  responsePayload,
  fbrErrorCode,
  fbrErrorMessage,
}: LogRowProps) {
  const [open, setOpen] = useState(false);
  const ok = httpStatus >= 200 && httpStatus < 300 && !fbrErrorCode;

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/40"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="font-mono text-xs text-muted-foreground">
          #{String(attempt).padStart(2, "0")}
        </span>
        <Badge variant={ok ? "success" : "destructive"}>HTTP {httpStatus}</Badge>
        {fbrErrorCode && (
          <Badge variant="warning" className="font-mono">
            {fbrErrorCode}
          </Badge>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {formatDateTime(attemptedAt)}
        </span>
      </button>
      {open && (
        <div className="grid gap-3 border-t bg-muted/20 p-3 lg:grid-cols-2">
          <PayloadBlock title="Request" payload={requestPayload} />
          <PayloadBlock
            title="Response"
            payload={responsePayload}
            errorMessage={fbrErrorMessage}
          />
        </div>
      )}
    </li>
  );
}

function PayloadBlock({
  title,
  payload,
  errorMessage,
}: {
  title: string;
  payload: string;
  errorMessage?: string;
}) {
  let pretty = payload;
  try {
    pretty = JSON.stringify(JSON.parse(payload), null, 2);
  } catch {
    pretty = payload;
  }
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-muted-foreground">{title}</div>
      {errorMessage && (
        <p className="mb-2 text-xs text-destructive">{errorMessage}</p>
      )}
      <pre
        className={cn(
          "max-h-72 overflow-auto rounded-md border bg-background p-3 text-[11px] leading-relaxed",
          "font-mono",
        )}
      >
        {pretty}
      </pre>
    </div>
  );
}
