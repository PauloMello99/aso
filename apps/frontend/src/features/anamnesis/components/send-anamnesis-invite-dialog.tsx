"use client"

import { useEffect, useState } from "react"
import { Loader2, MailCheck } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Label } from "@/shared/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { useServiceTypes } from "@/features/services/hooks/use-service-types"
import {
  sendAnamnesisInviteErrorMessage,
  useSendAnamnesisInvite,
} from "../hooks/use-send-anamnesis-invite"

interface SendAnamnesisInviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  customerId: string
  customerName: string
}

/** Modal para disparar por e-mail o link de preenchimento da ficha de anamnese (M10b). */
export function SendAnamnesisInviteDialog({
  open,
  onOpenChange,
  orgId,
  customerId,
  customerName,
}: SendAnamnesisInviteDialogProps) {
  const { serviceTypes, loading: typesLoading } = useServiceTypes(orgId)
  const { mutateAsync: sendInvite, isPending: sending } =
    useSendAnamnesisInvite(orgId)

  const [serviceTypeId, setServiceTypeId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (open) {
      setServiceTypeId("")
      setError(null)
      setSent(false)
    }
  }, [open])

  async function handleSubmit() {
    if (!serviceTypeId) return
    setError(null)
    try {
      await sendInvite({ customerId, serviceTypeId })
      setSent(true)
    } catch (err) {
      setError(sendAnamnesisInviteErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {sent ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MailCheck className="h-5 w-5 text-emerald-400" />
                Ficha enviada
              </DialogTitle>
              <DialogDescription>
                Ficha enviada por e-mail para {customerName}.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                className="w-full sm:w-auto"
                onClick={() => onOpenChange(false)}
              >
                Fechar
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Enviar ficha de anamnese</DialogTitle>
              <DialogDescription>
                Escolha o tipo de serviço para enviar por e-mail o link de
                preenchimento da ficha para {customerName}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5">
              <Label>
                Tipo de serviço <span className="text-red-400">*</span>
              </Label>
              {!typesLoading && serviceTypes.length === 0 ? (
                <p className="text-xs text-foreground/40">
                  Nenhum tipo de serviço cadastrado ainda. Crie um tipo ao
                  lançar um serviço em Serviços.
                </p>
              ) : (
                <Select
                  value={serviceTypeId}
                  onValueChange={setServiceTypeId}
                  disabled={typesLoading}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        typesLoading
                          ? "Carregando…"
                          : "Selecione o tipo de serviço"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <DialogFooter showCloseButton>
              <Button
                type="button"
                disabled={!serviceTypeId || sending}
                onClick={() => void handleSubmit()}
                className="w-full sm:w-auto"
              >
                {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar convite
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
