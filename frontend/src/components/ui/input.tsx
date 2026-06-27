import * as React from "react"

import { cn } from "@/lib/utils"
import { capitalizeFirst } from "@/lib/ticket-utils"

interface InputProps extends React.ComponentProps<"input"> {
  // Opt-in: auto-uppercases only the first typed character, for prose
  // fields (names, addresses) — never set this on email/password/phone/code
  // fields where casing is meaningful or user-controlled.
  capitalize?: boolean
}

function Input({ className, type, capitalize, onChange, ...props }: InputProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (capitalize) {
      e.target.value = capitalizeFirst(e.target.value)
    }
    onChange?.(e)
  }

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-md border border-transparent bg-input/50 px-2.5 py-1 text-base transition-[color,box-shadow] duration-200 outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      onChange={handleChange}
      {...props}
    />
  )
}

export { Input }
