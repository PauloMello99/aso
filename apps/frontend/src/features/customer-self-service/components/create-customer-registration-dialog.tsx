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
import { Input } from "@/shared/components/ui/input"
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
  sendCustomerRegistrationInviteErrorMessage,
  useSendCustomerRegistrationInvite,
} from "../hooks/use-send-customer-registration-invite"

interface CreateCustomerRegistrationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
}

export function CreateCustomerRegistrationDialog({
  open,
  onOpenChange,
  orgId,
}: CreateCustomerRegistrationDialogProps) {
  const { serviceTypes, loading: typesLoading } = useServiceTypes(orgId)
  const { mutateAsync: sendInvite, isPending: sending } =
    useSendCustomerRegistrationInvite(orgId)

  const [email, setEmail] = useState("")
  const [serviceTypeId, setServiceTypeId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (open) {
      setEmail("")
      setServiceTypeId("")
      setError(null)
      setSent(false)
    }
  }, [open])

  async function handleSubmit() {
    if (!email || !serviceTypeId) return
    setError(null)
    try {
      await sendInvite({ email, serviceTypeId })
      setSent(true)
    } catch (err) {
      setError(sendCustomerRegistrationInviteErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {sent ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MailCheck className="h-5 w-5 text-success" />
                Convite enviado
              </DialogTitle>
              <DialogDescription>
                Convite enviado para {email}.
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
              <DialogTitle>Criar cliente + ficha via link</DialogTitle>
              <DialogDescription>
                Enviaremos um link por e-mail para a pessoa se cadastrar e
                preencher a ficha de anamnese do tipo de serviço escolhido.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5">
              <Label>
                E-mail <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@email.com"
                autoComplete="off"
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Tipo de serviço <span className="text-destructive">*</span>
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
                disabled={!email || !serviceTypeId || sending}
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
