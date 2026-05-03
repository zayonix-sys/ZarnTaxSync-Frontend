import { useState } from "react";
import { Check, Copy, KeyRound, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CreateApiKeyResponse } from "@/api/users";

interface ApiKeyOneTimeModalProps {
  /** Newly issued key, with `rawKey` returned by the backend exactly once. */
  result: CreateApiKeyResponse | null;
  onClose: () => void;
}

/**
 * One-time secret display per Phase 5 plan:
 *  - The `rawKey` is shown ONCE, with copy-to-clipboard
 *  - User must check "I have saved this key" before the modal can be dismissed.
 */
export function ApiKeyOneTimeModal({ result, onClose }: ApiKeyOneTimeModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [copied, setCopied] = useState(false);

  const open = !!result;

  const onCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.rawKey);
      setCopied(true);
      toast.success("Key copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy — copy manually from the field");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          if (acknowledged) {
            setAcknowledged(false);
            setCopied(false);
            onClose();
          }
          // If not acknowledged, swallow the close attempt.
        }
      }}
    >
      <DialogContent className="max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            New API key — copy now
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium">{result?.name}</span> · prefix{" "}
            <code>{result?.keyPrefix}</code>
          </DialogDescription>
        </DialogHeader>

        <Alert variant="warning">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>This is the only time the full key is shown</AlertTitle>
          <AlertDescription>
            Store it in your secrets manager now. The backend keeps only a
            hash — there is no way to retrieve it later.
          </AlertDescription>
        </Alert>

        <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
          <code className="flex-1 break-all font-mono text-xs">
            {result?.rawKey}
          </code>
          <Button type="button" variant="outline" size="sm" onClick={onCopy}>
            {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
          />
          <span>
            I've copied this key and stored it somewhere safe. I understand I
            won't be able to see it again.
          </span>
        </label>

        <DialogFooter>
          <Button
            disabled={!acknowledged}
            onClick={() => {
              setAcknowledged(false);
              setCopied(false);
              onClose();
            }}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
