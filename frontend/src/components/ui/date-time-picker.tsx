import * as React from "react"
import { format } from "date-fns"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function DateTimePicker({
  date,
  onDateChange,
  time,
  onTimeChange,
  dateLabel = "Date",
  timeLabel = "Time",
  dateDisabled = false,
  className,
}: {
  date: Date | undefined
  onDateChange: (date: Date | undefined) => void
  time: string
  onTimeChange: (time: string) => void
  dateLabel?: string
  timeLabel?: string
  dateDisabled?: boolean
  className?: string
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className={cn("flex flex-row gap-3", className)}>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-neutral-500">{dateLabel}</label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={dateDisabled}
              className="w-40 justify-between font-normal"
            >
              {date ? format(date, "PPP") : "Select date"}
              <ChevronDownIcon />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              captionLayout="dropdown"
              defaultMonth={date}
              onSelect={(selected) => {
                onDateChange(selected)
                setOpen(false)
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex w-32 flex-col gap-1.5">
        <label className="text-xs font-semibold text-neutral-500">{timeLabel}</label>
        <Input
          type="time"
          step="1"
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
      </div>
    </div>
  )
}
