"use client"

import { useEffect, useMemo, useState } from "react"
import { FileDown, Loader2, Mail } from "lucide-react"
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
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { useAnamnesisResponse } from "../hooks/use-anamnesis-responses"
import {
  sendAnamnesisCopyErrorMessage,
  useSendAnamnesisResponseCopy,
} from "../hooks/use-send-anamnesis-response-copy"
import { ANAMNESIS_RESPONSE_STATUS_LABELS } from "../types"

interface AnamnesisResponseViewerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  responseId: string | undefined
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-foreground/40">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  )
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function fmtCpf(cpf: string | null): string {
  if (!cpf) return "—"
  const digits = cpf.replace(/\D/g, "")
  if (digits.length !== 11) return cpf
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
}

export function AnamnesisResponseViewer({
  open,
  onOpenChange,
  orgId,
  responseId,
}: AnamnesisResponseViewerProps) {
  const { response, loading, error } = useAnamnesisResponse(orgId, responseId)
  const {
    mutateAsync: sendCopy,
    isPending: sendingCopy,
    isSuccess: copySent,
    reset: resetSendCopy,
  } = useSendAnamnesisResponseCopy(orgId, responseId ?? "")
  const [copyError, setCopyError] = useState<string | null>(null)

  useEffect(() => {
    resetSendCopy()
    setCopyError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responseId])

  async function handleSendCopy() {
    setCopyError(null)
    try {
      await sendCopy()
    } catch (err) {
      setCopyError(sendAnamnesisCopyErrorMessage(err))
    }
  }

  const answersByQuestion = useMemo(() => {
    const map = new Map<string, (string | boolean)[]>()
    for (const answer of response?.answers ?? []) {
      const list = map.get(answer.questionId) ?? []
      list.push(answer.value)
      map.set(answer.questionId, list)
    }
    return map
  }, [response?.answers])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 sm:max-w-2xl">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle>
              {response?.customerName ?? "Ficha de anamnese"}
            </SheetTitle>
            {response && (
              <Badge
                variant={response.status === "submitted" ? "success" : "warning"}
              >
                {ANAMNESIS_RESPONSE_STATUS_LABELS[response.status]}
              </Badge>
            )}
          </div>
          <SheetDescription>
            {response?.serviceTypeName ?? "Detalhes da ficha"}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="flex flex-col gap-6 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-foreground/30">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : error || !response ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              Não foi possível carregar a ficha de anamnese.
            </div>
          ) : (
            <>
              <section className="flex flex-col gap-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
                  Dados
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Cliente" value={response.customerName ?? "—"} />
                  <Field
                    label="Tipo de serviço"
                    value={response.serviceTypeName ?? "—"}
                  />
                  <Field
                    label="Versão do formulário"
                    value={
                      response.versionNumber
                        ? String(response.versionNumber)
                        : "—"
                    }
                  />
                  <Field
                    label="Data de envio"
                    value={fmtDateTime(response.submittedAt)}
                  />
                </div>
              </section>

              <section className="flex flex-col gap-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
                  Respostas
                </h3>
                {response.questionsSnapshot.length === 0 ? (
                  <p className="text-xs text-foreground/30">
                    Nenhuma pergunta registrada nesta versão.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {response.questionsSnapshot.map((question) => {
                      const values = answersByQuestion.get(question.id) ?? []
                      return (
                        <li
                          key={question.id}
                          className="rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-3"
                        >
                          <p className="text-xs text-foreground/40">
                            {question.label}
                          </p>
                          {values.length === 0 ? (
                            <p className="text-sm text-foreground/30">—</p>
                          ) : (
                            values.map((value, index) => (
                              <p key={index} className="text-sm text-foreground">
                                {typeof value === "boolean"
                                  ? value
                                    ? "Sim"
                                    : "Não"
                                  : value}
                              </p>
                            ))
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>

              <section className="flex flex-col gap-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
                  Assinatura
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field
                    label="Nome do assinante"
                    value={response.signerFullName ?? "—"}
                  />
                  <Field label="CPF" value={fmtCpf(response.signerCpf)} />
                </div>
                {response.signatureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={response.signatureUrl}
                    alt="Assinatura do cliente"
                    className="h-24 w-fit rounded-lg border border-foreground/[0.08] bg-foreground/[0.04] object-contain p-2"
                  />
                ) : (
                  <p className="text-xs text-foreground/30">
                    Assinatura indisponível.
                  </p>
                )}
              </section>

              {response.status === "submitted" && (
                <section className="flex flex-col gap-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
                    Documento
                  </h3>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    {response.pdfUrl && (
                      <Button
                        variant="outline"
                        asChild
                        className="w-full sm:w-auto"
                      >
                        <a
                          href={response.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FileDown className="h-4 w-4" />
                          Abrir PDF
                        </a>
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      disabled={sendingCopy}
                      onClick={() => void handleSendCopy()}
                    >
                      {sendingCopy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4" />
                      )}
                      Enviar por e-mail ao cliente
                    </Button>
                  </div>
                  {copySent && !copyError && (
                    <p className="text-xs text-success">
                      PDF enviado para o e-mail do cliente.
                    </p>
                  )}
                  {copyError && (
                    <p className="text-xs text-destructive">{copyError}</p>
                  )}
                </section>
              )}
            </>
          )}
        </SheetBody>

        <SheetFooter>
          <SheetClose asChild>
            <Button type="button" variant="outline" className="w-full sm:w-auto">
              Fechar
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
