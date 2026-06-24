"use client"

import { useState } from "react"
import { ClipboardCheck, History, Loader2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet"
import { Switch } from "@/shared/components/ui/switch"
import { useMaterials } from "../hooks/use-materials"
import { useStockVerification } from "../hooks/use-stock-verification"

interface StockVerificationPageProps {
  orgId: string
}

export function StockVerificationPage({ orgId }: StockVerificationPageProps) {
  const { materials } = useMaterials(orgId)
  const { settings, verifications, setInterval, createVerification } =
    useStockVerification(orgId)

  const [intervalInput, setIntervalInput] = useState("")
  const [savedInterval, setSavedInterval] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [counts, setCounts] = useState<Record<string, string>>({})
  const [reconcile, setReconcile] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const intervalValue =
    intervalInput !== "" ? intervalInput : settings.intervalDays?.toString() ?? ""

  async function saveInterval() {
    setSavedInterval(false)
    const n = Number.parseInt(intervalValue, 10)
    await setInterval(Number.isNaN(n) || n <= 0 ? null : n)
    setSavedInterval(true)
  }

  function openConference() {
    const initial: Record<string, string> = {}
    for (const m of materials) initial[m.id] = m.stockQuantity
    setCounts(initial)
    setSheetOpen(true)
  }

  async function submitConference() {
    setSubmitting(true)
    try {
      await createVerification({
        reconcile,
        items: materials.map((m) => ({
          materialId: m.id,
          physicalQuantity: counts[m.id] ?? m.stockQuantity,
        })),
      })
      setSheetOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid gap-8">
      <div>
        <h2 className="text-lg font-semibold">Conferência de estoque</h2>
        <p className="mt-0.5 text-sm text-white/50">
          Lembrete periódico + registro da contagem física vs. o sistema.
        </p>
      </div>

      {/* Interval setting */}
      <section className="grid max-w-md gap-2">
        <Label>Lembrar de conferir a cada (dias)</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            min={1}
            placeholder="Ex.: 15 (vazio = sem lembrete)"
            value={intervalValue}
            onChange={(e) => setIntervalInput(e.target.value)}
          />
          <Button onClick={saveInterval} className="shrink-0">
            Salvar
          </Button>
        </div>
        {savedInterval && <p className="text-xs text-emerald-400">Salvo.</p>}
        {settings.lastVerificationAt && (
          <p className="text-xs text-white/40">
            Última conferência:{" "}
            {new Date(settings.lastVerificationAt).toLocaleDateString("pt-BR")}
          </p>
        )}
      </section>

      {/* Conference action */}
      <section>
        <Button onClick={openConference}>
          <ClipboardCheck className="h-4 w-4" />
          Conferir estoque agora
        </Button>
      </section>

      {/* History */}
      <section className="grid gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-medium text-white/70">
          <History className="h-3.5 w-3.5" /> Histórico
        </h3>
        {verifications.length === 0 ? (
          <p className="text-xs text-white/30">Nenhuma conferência registrada.</p>
        ) : (
          <ul className="grid gap-1.5">
            {verifications.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm"
              >
                <span className="text-white/70">
                  {new Date(v.createdAt).toLocaleString("pt-BR")}
                </span>
                <span className="text-white/40">
                  {v.itemCount} itens ·{" "}
                  <span
                    className={
                      v.discrepancyCount > 0 ? "text-orange-400" : "text-white/40"
                    }
                  >
                    {v.discrepancyCount} divergência(s)
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Conference sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="gap-0 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Conferir estoque</SheetTitle>
            <SheetDescription>
              Informe a quantidade física de cada material.
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-3 py-6">
            {materials.length === 0 && (
              <p className="text-sm text-white/30">Nenhum material ativo.</p>
            )}
            {materials.map((m) => {
              const physical = counts[m.id] ?? m.stockQuantity
              const diff =
                Number.parseFloat(physical || "0") -
                Number.parseFloat(m.stockQuantity)
              return (
                <div key={m.id} className="grid gap-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm text-white/80">{m.name}</span>
                    <span className="text-xs text-white/30">
                      sistema: {m.stockQuantity}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      inputMode="decimal"
                      value={physical}
                      onChange={(e) =>
                        setCounts((c) => ({ ...c, [m.id]: e.target.value }))
                      }
                    />
                    {diff !== 0 && (
                      <span
                        className={`shrink-0 text-xs ${
                          diff > 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {diff > 0 ? "+" : ""}
                        {diff.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
            <label className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <span className="text-sm text-white/70">
                Reconciliar (ajustar o estoque às divergências)
              </span>
              <Switch checked={reconcile} onCheckedChange={setReconcile} />
            </label>
          </SheetBody>
          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                Cancelar
              </Button>
            </SheetClose>
            <Button
              onClick={submitConference}
              disabled={submitting || materials.length === 0}
              className="w-full sm:w-auto"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Registrar conferência"
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
