import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "./label"

interface DatePickerProps {
  date?: Date
  onChange?: (date: Date | undefined) => void
  label?: string
  placeholder?: string
  className?: string
  id?: string
}

export function DatePicker({
  date,
  onChange,
  label,
  placeholder = "Pick a date",
  className,
  id,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const pickerId = id || React.useId()

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={pickerId}
            variant={"outline"}
            className={cn(
              "peer w-full justify-start text-left font-normal h-10 px-3 py-2",
              label && "h-12 pt-4 pb-1",
              !date && "text-muted-foreground",
              className
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
            {date ? format(date, "PPP") : (label ? "" : placeholder)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            selected={date}
            onSelect={(d) => {
              onChange?.(d)
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
      {label && (
        <Label
          htmlFor={pickerId}
          className={cn(
            "absolute left-9 top-1/2 -translate-y-1/2 text-sm text-muted-foreground transition-all duration-200 pointer-events-none px-1 bg-background",
            (date || open) ? "top-0 text-xs text-primary bg-background" : "bg-transparent"
          )}
        >
          {label}
        </Label>
      )}
    </div>
  )
}
