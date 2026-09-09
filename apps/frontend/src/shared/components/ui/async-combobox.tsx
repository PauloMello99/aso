"use client"

import * as React from "react"
import { Check, ChevronDown, Loader2, Search } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover"
import { Input } from "@/shared/components/ui/input"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import { DEFAULT_OPTIONS_TRUNCATION_LIMIT } from "@/shared/lib/options-query"

interface AsyncComboboxProps<T> {
  id?: string
  value: string | undefined
  onValueChange: (value: string) => void
  options: T[]
  selectedOption: T | undefined
  loading: boolean
  isFetching: boolean
  truncated: boolean
  truncatedLimit?: number
  error?: string | null
  onRetry?: () => void
  search: string
  onSearchChange: (search: string) => void
  getOptionId: (option: T) => string
  getOptionLabel: (option: T) => string
  renderOption?: (option: T) => React.ReactNode
  placeholder?: string
  searchPlaceholder?: string
  emptyLabel?: string
  disabled?: boolean
  footer?: React.ReactNode
  "aria-describedby"?: string
  "aria-invalid"?: React.AriaAttributes["aria-invalid"]
}

export function AsyncCombobox<T>({
  id,
  value,
  onValueChange,
  options,
  selectedOption,
  loading,
  isFetching,
  truncated,
  truncatedLimit = DEFAULT_OPTIONS_TRUNCATION_LIMIT,
  error,
  onRetry,
  search,
  onSearchChange,
  getOptionId,
  getOptionLabel,
  renderOption,
  placeholder = "Selecione…",
  searchPlaceholder = "Buscar…",
  emptyLabel = "Nenhum resultado.",
  disabled,
  footer,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: AsyncComboboxProps<T>) {
  const [open, setOpen] = React.useState(false)
  const [activeIndex, setActiveIndex] = React.useState(-1)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLUListElement>(null)
  const generatedId = React.useId()
  const listboxId = `${generatedId}-listbox`

  // Sempre que a lista (busca) ou o valor mudam, realinha o item ativo com o
  // selecionado (ou o primeiro resultado) para que Enter tenha um alvo óbvio.
  React.useEffect(() => {
    if (options.length === 0) {
      setActiveIndex(-1)
      return
    }
    const idx = value ? options.findIndex((o) => getOptionId(o) === value) : -1
    setActiveIndex(idx >= 0 ? idx : 0)
  }, [options, value, getOptionId])

  React.useEffect(() => {
    if (!open) return
    const el = listRef.current?.querySelector<HTMLLIElement>(
      `[data-index="${activeIndex}"]`,
    )
    el?.scrollIntoView({ block: "nearest" })
  }, [activeIndex, open])

  function handleSelect(option: T) {
    onValueChange(getOptionId(option))
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, options.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const option = options[activeIndex]
      if (option) handleSelect(option)
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  const showingOptions = !loading && !error && options.length > 0
  const activeOptionId =
    showingOptions && activeIndex >= 0 && activeIndex < options.length
      ? `${listboxId}-opt-${activeIndex}`
      : undefined

  return (
    <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-foreground/[0.08] bg-foreground/[0.04] px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors",
            "focus:border-foreground/20 focus:ring-1 focus:ring-foreground/10",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <span
            className={cn(
              "line-clamp-1 text-left",
              !selectedOption && "text-foreground/30",
            )}
          >
            {selectedOption ? getOptionLabel(selectedOption) : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-foreground/40" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          inputRef.current?.focus()
        }}
      >
        <div className="relative border-b border-foreground/[0.06] p-1.5">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/30" />
          <Input
            ref={inputRef}
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeOptionId}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={searchPlaceholder}
            className="h-9 pl-9 pr-8"
          />
          {isFetching && !loading && (
            <Loader2 className="absolute right-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-foreground/30" />
          )}
        </div>

        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="max-h-64 overflow-y-auto p-1"
        >
          {loading ? (
            <li className="px-2 py-6 text-center text-sm text-foreground/40">
              Carregando…
            </li>
          ) : error ? (
            <li className="flex flex-col items-center gap-2 px-2 py-6 text-center text-sm text-destructive">
              <span>{error}</span>
              {onRetry && (
                <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                  Tentar novamente
                </Button>
              )}
            </li>
          ) : options.length === 0 ? (
            <li className="px-2 py-6 text-center text-sm text-foreground/40">
              {emptyLabel}
            </li>
          ) : (
            options.map((option, index) => {
              const optionId = getOptionId(option)
              const isSelected = optionId === value
              const isActive = index === activeIndex
              return (
                <li
                  key={optionId}
                  id={`${listboxId}-opt-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => handleSelect(option)}
                  className={cn(
                    "relative flex min-h-[40px] w-full cursor-default select-none items-center rounded-md py-1.5 pl-2 pr-8 text-sm outline-none transition-colors",
                    isActive && "bg-foreground/[0.06] text-foreground",
                  )}
                >
                  <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </span>
                  {renderOption ? renderOption(option) : getOptionLabel(option)}
                </li>
              )
            })
          )}
        </ul>

        {truncated && (
          <p className="border-t border-foreground/[0.06] px-2 py-1.5 text-xs text-foreground/40">
            Mostrando os primeiros {truncatedLimit} — refine a busca
          </p>
        )}

        {footer && (
          <div className="border-t border-foreground/[0.06] p-1">{footer}</div>
        )}
      </PopoverContent>
    </Popover>
  )
}
