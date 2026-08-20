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
import type { Customer } from "@/features/clients/types"
import {
  sendCustomerUpdateInviteErrorMessage,
  useSendCustomerUpdateInvite,
} from "../hooks/use-send-customer-update-invite"

interface SendCustomerUpdateInviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  customer: Customer
}

export function SendCustomerUpdateInviteDialog({
  open,
  onOpenChange,
  orgId,
  customer,
}: SendCustomerUpdateInviteDialogProps) {
  const { mutateAsync: sendInvite, isPending: sending } =
    useSendCustomerUpdateInvite(orgId, customer.id)

  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (open) {
      setError(null)
      setSent(false)
    }
  }, [open])

  async function handleSubmit() {
    setError(null)
    try {
      await sendInvite()
      setSent(true)
    } catch (err) {
      setError(sendCustomerUpdateInviteErrorMessage(err))
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
                Convite enviado por e-mail para {customer.name}.
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
              <DialogTitle>Enviar atualização cadastral</DialogTitle>
              <DialogDescription>
                Enviaremos um link por e-mail para{" "}
                <span className="font-medium text-foreground">
                  {customer.name}
                </span>{" "}
                atualizar endereço, telefone e demais dados cadastrais.
              </DialogDescription>
            </DialogHeader>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <DialogFooter showCloseButton>
              <Button
                type="button"
                disabled={sending}
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
