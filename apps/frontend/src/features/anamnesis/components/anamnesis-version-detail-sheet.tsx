"use client"

import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet"
import { Badge } from "@/shared/components/ui/badge"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import type { AnamnesisFormVersion, AnamnesisQuestion } from "../types"

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

// Mesmo layout visual que o cliente vê em /anamnesis/[token]
// (AnamnesisQuestionField em anamnesis-public-page.tsx), só que desabilitado —
// isto é um preview da estrutura da ficha, não uma resposta preenchida.
function ReadonlyQuestionField({ question }: { question: AnamnesisQuestion }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>
        {question.label || (
          <span className="italic text-foreground/30">Pergunta sem texto</span>
        )}
        {question.required && <span className="ml-1 text-destructive">*</span>}
      </Label>

      {question.type === "text" ? (
        <Textarea placeholder="Sua resposta" disabled />
      ) : (
        <Select disabled>
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Sim</SelectItem>
            <SelectItem value="false">Não</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  )
}

interface AnamnesisVersionDetailSheetProps {
  version: AnamnesisFormVersion | null
  open: boolean
  onOpenChange: (open: boolean) => void
  isCurrent: boolean
}

export function AnamnesisVersionDetailSheet({
  version,
  open,
  onOpenChange,
  isCurrent,
}: AnamnesisVersionDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex flex-wrap items-center gap-2">
            Versão {version?.versionNumber}
            {isCurrent && <Badge variant="success">Vigente</Badge>}
          </SheetTitle>
          <SheetDescription>
            {version && `Criada em ${fmtDate(version.createdAt)} · `}
            Perguntas exatamente como o cliente verá — somente leitura.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="flex flex-col gap-4 py-6">
          {version?.questions.length === 0 ? (
            <p className="rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-4 text-sm text-foreground/40">
              Esta versão não tem nenhuma pergunta.
            </p>
          ) : (
            version?.questions.map((question) => (
              <ReadonlyQuestionField key={question.id} question={question} />
            ))
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}
