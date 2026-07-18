"use client"

import * as React from "react"
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumber,
  type CountryCode,
} from "libphonenumber-js"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { Input } from "@/shared/components/ui/input"
import { cn } from "@/shared/lib/utils"

const PRIORITY: CountryCode[] = ["BR", "US"]
const ORDERED_COUNTRIES: CountryCode[] = [
  ...PRIORITY,
  ...getCountries().filter((c) => !PRIORITY.includes(c)),
]

const DEFAULT_COUNTRY: CountryCode = "BR"

function flagEmoji(cc: string): string {
  return cc
    .toUpperCase()
    .replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)))
}

interface PhoneInputProps {
  value?: string
  onChange?: (value: string) => void
  id?: string
  placeholder?: string
  className?: string
}

export function PhoneInput({
  value = "",
  onChange,
  id,
  placeholder = "Número de telefone",
  className,
}: PhoneInputProps) {
  const [country, setCountry] = React.useState<CountryCode>(() => {
    if (value) {
      try {
        const parsed = parsePhoneNumber(value)
        if (parsed?.country) return parsed.country
      } catch {
        void 0
      }
    }
    return DEFAULT_COUNTRY
  })

  const [display, setDisplay] = React.useState<string>(() => {
    if (value) {
      try {
        return parsePhoneNumber(value)?.formatNational() ?? ""
      } catch {
        void 0
      }
    }
    return ""
  })

  React.useEffect(() => {
    if (!value) {
      setDisplay("")
      return
    }
    try {
      const parsed = parsePhoneNumber(value)
      if (parsed) {
        if (parsed.country) setCountry(parsed.country)
        setDisplay(parsed.formatNational())
      }
    } catch {
      void 0
    }
  }, [value])

  function emit(rawNational: string, forCountry: CountryCode) {
    const formatter = new AsYouType(forCountry)
    const formatted = formatter.input(rawNational)
    setDisplay(formatted)
    onChange?.(formatter.getNumber()?.number ?? "")
  }

  return (
    <div className={cn("flex gap-2", className)}>
      <Select
        value={country}
        onValueChange={(c) => {
          const next = c as CountryCode
          setCountry(next)
          emit(display, next)
        }}
      >
        <SelectTrigger className="w-[104px] shrink-0" aria-label="País">
          <SelectValue>
            <span className="flex items-center gap-1.5">
              <span className="text-base leading-none">{flagEmoji(country)}</span>
              <span className="text-foreground/60">
                +{getCountryCallingCode(country)}
              </span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {ORDERED_COUNTRIES.map((c) => (
            <SelectItem key={c} value={c}>
              <span className="flex items-center gap-2">
                <span className="text-base leading-none">{flagEmoji(c)}</span>
                <span>{c}</span>
                <span className="text-foreground/40">+{getCountryCallingCode(c)}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="off"
        placeholder={placeholder}
        value={display}
        onChange={(e) => emit(e.target.value, country)}
      />
    </div>
  )
}
