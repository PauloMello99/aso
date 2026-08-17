"use client"

import * as React from "react"
import { Input } from "@/shared/components/ui/input"
import { cn } from "@/shared/lib/utils"
import { centsToReaisInput } from "@/features/cashier/lib/money"

interface CurrencyInputProps {
  value: number | null
  onValueChange: (cents: number | null) => void
  id?: string
  name?: string
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function CurrencyInput({
  value,
  onValueChange,
  id,
  name,
  placeholder = "0,00",
  className,
  disabled,
}: CurrencyInputProps) {
  const [display, setDisplay] = React.useState<string>(() =>
    value === null ? "" : centsToReaisInput(value),
  )

  React.useEffect(() => {
    setDisplay(value === null ? "" : centsToReaisInput(value))
  }, [value])

  function emit(raw: string) {
    // dígitos viram centavos direto (mesma lógica "as-you-type" do PhoneInput,
    // adaptada: em vez de reparsear a string mascarada, deriva o valor a partir
    // apenas dos dígitos digitados, evitando inflar o valor a cada tecla)
    const digits = raw.replace(/\D/g, "")
    if (!digits) {
      setDisplay("")
      onValueChange(null)
      return
    }

    const cents = Number.parseInt(digits, 10)
    setDisplay(centsToReaisInput(cents))
    onValueChange(cents)
  }

  return (
    <Input
      id={id}
      name={name}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder}
      disabled={disabled}
      className={cn(className)}
      value={display}
      onChange={(e) => emit(e.target.value)}
    />
  )
}
