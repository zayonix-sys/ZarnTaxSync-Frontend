import * as React from "react";

import { cn } from "@/lib/utils";

import { Label } from "./label";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  startIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, id, startIcon, ...props }, ref) => {
    const inputId = id || React.useId();

    const input = (
      <input
        type={type}
        id={inputId}
        className={cn(
          "peer flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
          label && "h-12 pt-4 pb-1 placeholder-transparent",
          startIcon && "pl-9",
          !startIcon && label && "pl-4",
          className,
        )}
        ref={ref}
        {...props}
        placeholder={label ? " " : props.placeholder}
      />
    );

    if (!label && !startIcon) return input;

    return (
      <div className="relative">
        {startIcon && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">
            {startIcon}
          </div>
        )}
        {input}
        {label && (
          <Label
            htmlFor={inputId}
            className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground transition-all duration-200 pointer-events-none px-1 bg-background",
              "peer-placeholder-shown:bg-transparent",
              "peer-focus:top-0 peer-focus:text-xs peer-focus:text-primary peer-focus:bg-background",
              "peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-background",
              startIcon && "left-9 peer-focus:left-3 peer-[:not(:placeholder-shown)]:left-3"
            )}
          >
            {label}
          </Label>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
