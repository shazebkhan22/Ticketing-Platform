import * as React from "react"
import { CheckIcon, ChevronsUpDownIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export interface ComboboxOption {
  value: string
  label: string
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  allowCustomValue = false,
  disabled,
  clearable = true,
  className,
}: {
  options: ComboboxOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  /** When true, typing a value not in `options` and pressing Enter / leaving keeps the typed text as the value — for free-text fields with suggestions. */
  allowCustomValue?: boolean
  disabled?: boolean
  /** Shows an "x" to reset the field back to empty without reopening the popover and picking something else. */
  clearable?: boolean
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value

  function handleSelect(nextValue: string) {
    onChange(nextValue)
    setSearch("")
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next && allowCustomValue && search.trim()) {
          onChange(search.trim())
        }
        if (next) setSearch("")
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal bg-input/50 px-3 py-5",
            !value && "",
            className
          )}
        >
          <span className="truncate text-muted-foreground">{value ? selectedLabel : placeholder}</span>
          <span className="ml-2 flex shrink-0 items-center gap-1">
            {clearable && value && !disabled && (
              // Button's own styles force `pointer-events: none` on every
              // svg inside it (so icon glyphs don't swallow clicks meant for
              // the button) — wrapping the icon in a span and opting back
              // into pointer-events here is what actually makes it clickable
              // instead of falling through to the trigger underneath.
              <span
                role="button"
                aria-label="Clear"
                className="pointer-events-auto rounded-sm p-0.5 opacity-50 hover:bg-foreground/10 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  setOpen(false)
                  onChange("")
                }}
              >
                <XIcon className="size-4" />
              </span>
            )}
            <ChevronsUpDownIcon className="size-4 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command shouldFilter={!allowCustomValue}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
            onKeyDown={(e) => {
              if (e.key === "Enter" && allowCustomValue && search.trim()) {
                const match = options.find(
                  (o) => o.label.toLowerCase() === search.trim().toLowerCase()
                )
                handleSelect(match ? match.value : search.trim())
              }
            }}
          />
          <CommandList>
            {allowCustomValue ? (
              <>
                {options
                  .filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
                  .map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={handleSelect}
                      data-checked={option.value === value}
                    >
                      <CheckIcon
                        className={cn(
                          "size-4",
                          option.value === value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {option.label}
                    </CommandItem>
                  ))}
                {search.trim() &&
                  !options.some((o) => o.label.toLowerCase() === search.trim().toLowerCase()) && (
                    <CommandItem value={search.trim()} onSelect={handleSelect}>
                      Use "{search.trim()}"
                    </CommandItem>
                  )}
              </>
            ) : (
              <>
                <CommandEmpty>{emptyText}</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.label}
                      onSelect={() => handleSelect(option.value)}
                      data-checked={option.value === value}
                    >
                      <CheckIcon
                        className={cn(
                          "size-4",
                          option.value === value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
