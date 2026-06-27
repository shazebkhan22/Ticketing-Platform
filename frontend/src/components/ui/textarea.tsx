import * as React from "react"

import { cn } from "@/lib/utils"
import { capitalizeFirst } from "@/lib/ticket-utils"

interface TextareaProps extends React.ComponentProps<"textarea"> {
  // See Input's `capitalize` prop — same opt-in, first-character-only rule.
  capitalize?: boolean
}

function Textarea({ className, capitalize, onChange, ...props }: TextareaProps) {
  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    if (capitalize) {
      e.target.value = capitalizeFirst(e.target.value)
    }
    onChange?.(e)
  }

  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full resize-none rounded-lg border border-transparent bg-input/50 px-2.5 py-2 text-base transition-[color,box-shadow] duration-200 outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      onChange={handleChange}
      {...props}
    />
  )
}

export { Textarea }
