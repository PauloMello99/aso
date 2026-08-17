import * as React from "react"
import { Badge } from "@/shared/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/components/ui/accordion"

const FAQ_ITEMS = [
  {
    question: "Preciso colocar cartão para testar?",
    answer:
      "Sim. O teste de 60 dias é concedido uma vez por estúdio e começa quando você inicia o checkout — o cartão só é cobrado ao final, se você não cancelar antes.",
  },
  {
    question: "Meus tatuadores vão ver o faturamento do estúdio?",
    answer:
      "Não. Cada membro vê só o que é dele — agenda, serviços e caixa próprios. O dono decide, por módulo, o que cada pessoa acessa.",
  },
  {
    question: "Como fica a ficha de anamnese perante a LGPD?",
    answer:
      "Dado de saúde é sensível. O consentimento é gerado no servidor, com data e versão registradas, e vai impresso no PDF assinado pelo cliente.",
  },
  {
    question: "Consigo migrar o que já tenho em planilha?",
    answer:
      "Ainda não temos importador automático, mas nosso time ajuda a migrar seus dados manualmente — é só abrir um chamado no nosso canal de suporte. Estamos à disposição em qualquer etapa, não só na migração inicial.",
  },
  {
    question: "Tenho mais de uma unidade. Funciona?",
    answer:
      "Sim. Cada unidade é uma organização com dados isolados, acessada pela mesma conta.",
  },
  {
    question: "Posso cancelar quando quiser?",
    answer: "Sim, pelo portal de assinatura, sem multa nem fidelidade.",
  },
]

export function FaqSection() {
  return (
    <section id="faq" className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-16 text-center">
          <div className="mb-4 flex justify-center">
            <Badge
              variant="outline"
              className="border-foreground/10 font-semibold text-foreground/60"
            >
              Perguntas
            </Badge>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Perguntas frequentes
          </h2>
        </div>

        <Accordion type="single" collapsible className="mx-auto max-w-3xl">
          {FAQ_ITEMS.map((item) => (
            <AccordionItem key={item.question} value={item.question}>
              <AccordionTrigger>{item.question}</AccordionTrigger>
              <AccordionContent>{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
