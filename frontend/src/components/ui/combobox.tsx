import * as React from "react"
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"

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
          <span className="truncate">{value ? selectedLabel : placeholder}</span>
          <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
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
