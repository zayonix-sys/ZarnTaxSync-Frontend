import * as React from "react";

import { cn } from "@/lib/utils";

import { Label } from "./label";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, id, ...props }, ref) => {
    const textareaId = id || React.useId();
    
    const textarea = (
      <textarea
        ref={ref}
        id={textareaId}
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
          label && "peer pt-4 placeholder-transparent",
          className
        )}
        {...props}
        placeholder={label ? " " : props.placeholder}
      />
    );

    if (!label) return textarea;

    return (
      <div className="relative">
        {textarea}
        <Label
          htmlFor={textareaId}
          className={cn(
            "absolute left-3 top-4 -translate-y-1/2 text-sm text-muted-foreground transition-all duration-200 pointer-events-none px-1 bg-background",
            "peer-placeholder-shown:top-6 peer-placeholder-shown:text-sm peer-placeholder-shown:bg-transparent",
            "peer-focus:top-0 peer-focus:text-xs peer-focus:text-primary peer-focus:bg-background",
            "peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-background"
          )}
        >
          {label}
        </Label>
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
