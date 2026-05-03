import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowLeft, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useUploadInvoiceExcel } from "@/hooks/useInvoices";
import { normalizeError } from "@/api/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_auth/invoices/upload")({
  component: UploadInvoicesPage,
});

function UploadInvoicesPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [autoSubmit, setAutoSubmit] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadInvoiceExcel();

  const onPick = (f: FileList | null) => {
    if (!f || f.length === 0) return;
    const picked = f[0];
    if (!picked.name.toLowerCase().endsWith(".xlsx")) {
      toast.error("Only .xlsx files are accepted");
      return;
    }
    setFile(picked);
  };

  const onUpload = async () => {
    if (!file) return;
    try {
      const result = await upload.mutateAsync({ file, autoSubmit });
      toast.success(
        `Upload queued — ${result.totalRows} row${
          result.totalRows === 1 ? "" : "s"
        } parsed.`,
      );
      navigate({
        to: "/invoices",
        search: { page: 1, status: "Pending" },
      });
    } catch (err) {
      const norm = normalizeError(err);
      toast.error(norm.errors[0] ?? norm.message);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/invoices">
            <ArrowLeft className="h-4 w-4" />
            Back to invoices
          </Link>
        </Button>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Upload Excel
        </h1>
        <p className="text-sm text-muted-foreground">
          Bulk import invoices from a .xlsx file. The backend parses asynchronously.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workbook</CardTitle>
          <CardDescription>Drop the .xlsx file here or browse.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              onPick(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "grid cursor-pointer place-items-center rounded-lg border-2 border-dashed bg-muted/30 px-6 py-12 text-center transition-colors",
              dragOver && "border-primary bg-primary/5",
            )}
            role="button"
            tabIndex={0}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              hidden
              onChange={(e) => onPick(e.target.files)}
            />
            <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
            {file ? (
              <>
                <p className="mt-3 text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm font-medium">
                  Click to browse or drag a .xlsx file
                </p>
                <p className="text-xs text-muted-foreground">
                  Use the FBR-compliant invoice template.
                </p>
              </>
            )}
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="autoSubmit" className="text-sm">
                Auto-submit each row to FBR
              </Label>
              <p className="text-xs text-muted-foreground">
                Off: rows are saved as Pending and you can submit them later.
              </p>
            </div>
            <Switch
              id="autoSubmit"
              checked={autoSubmit}
              onCheckedChange={setAutoSubmit}
            />
          </div>

          <Alert variant="info">
            <AlertTitle>Backend gap H2</AlertTitle>
            <AlertDescription>
              No live job-status endpoint exists yet. After upload you'll be
              redirected to <code>/invoices?status=Pending</code> to track
              progress as rows trickle in.
            </AlertDescription>
          </Alert>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setFile(null)} disabled={!file}>
              Clear
            </Button>
            <Button onClick={onUpload} disabled={!file || upload.isPending}>
              {upload.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
