"use client"

import { useEffect, useRef, useState } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Plus } from "lucide-react"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
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
import { Form } from "@/shared/components/ui/form"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import { useAnamnesisForm } from "../hooks/use-anamnesis-form"
import {
  anamnesisFormSchema,
  type AnamnesisFormValues,
} from "../schemas/anamnesis.schemas"
import { SortableQuestionItem } from "./sortable-question-item"

interface AnamnesisFormBuilderProps {
  orgId: string
  serviceTypeId: string
  serviceTypeName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AnamnesisFormBuilder({
  orgId,
  serviceTypeId,
  serviceTypeName,
  open,
  onOpenChange,
}: AnamnesisFormBuilderProps) {
  const { currentVersion, loading, loadError, saveForm, saving } =
    useAnamnesisForm(orgId, serviceTypeId)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const seededRef = useRef(false)

  const form = useForm<AnamnesisFormValues>({
    resolver: zodResolver(anamnesisFormSchema),
    defaultValues: { questions: [] },
  })
  const { control, reset } = form
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "questions",
    keyName: "_key",
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // Reseeda o formulário uma vez por ciclo de abertura, nunca por identidade de
  // currentVersion — um refetch que produza novo objeto não pode apagar a
  // edição em andamento do usuário.
  useEffect(() => {
    if (!open) {
      seededRef.current = false
      return
    }
    if (loading || seededRef.current) return
    reset({ questions: currentVersion?.questions ?? [] })
    setError(null)
    seededRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loading, currentVersion])

  function addQuestion() {
    append({
      id: crypto.randomUUID(),
      type: "text",
      label: "",
      required: false,
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    setIsDragging(false)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = fields.findIndex((field) => field._key === active.id)
    const newIndex = fields.findIndex((field) => field._key === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    move(oldIndex, newIndex)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
    try {
      await saveForm(values.questions)
      onOpenChange(false)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar a ficha de anamnese.",
      )
    }
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="gap-0 sm:max-w-2xl"
        onEscapeKeyDown={(e) => {
          if (isDragging) e.preventDefault()
        }}
      >
        <Form {...form}>
          <form onSubmit={onSubmit} className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>
                Ficha de anamnese
                {serviceTypeName ? ` — ${serviceTypeName}` : ""}
              </SheetTitle>
              <SheetDescription>
                Cada salvamento publica uma nova versão da ficha.
              </SheetDescription>
            </SheetHeader>

            <SheetBody className="flex flex-col gap-4 py-6">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-foreground/40">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Carregando formulário…
                </div>
              ) : loadError ? (
                <p className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                  Não foi possível carregar a ficha de anamnese. Tente novamente.
                </p>
              ) : (
                <>
                  <div
                    className={cn(
                      "flex flex-col gap-3 rounded-xl border border-dashed border-foreground/15 p-3 sm:p-4",
                    )}
                  >
                    <p className="text-xs text-foreground/40">
                      Arraste para reordenar as perguntas
                    </p>
                    {fields.length === 0 ? (
                      <p className="rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-4 text-sm text-foreground/40">
                        Nenhuma pergunta ainda. Adicione a primeira abaixo.
                      </p>
                    ) : (
                      <DndContext
                        id="anamnesis-questions-dnd"
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={() => setIsDragging(true)}
                        onDragCancel={() => setIsDragging(false)}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={fields.map((field) => field._key)}
                          strategy={verticalListSortingStrategy}
                        >
                          <ul className="flex flex-col gap-3">
                            {fields.map((field, index) => (
                              <SortableQuestionItem
                                key={field._key}
                                id={field._key}
                                index={index}
                                control={control}
                                onRemove={() => remove(index)}
                              />
                            ))}
                          </ul>
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addQuestion}
                    className="self-start"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar pergunta
                  </Button>

                  {(form.formState.errors.questions?.root?.message ??
                    form.formState.errors.questions?.message) && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.questions?.root?.message ??
                        form.formState.errors.questions?.message}
                    </p>
                  )}
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </>
              )}
            </SheetBody>

            <SheetFooter>
              <SheetClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
              </SheetClose>
              <Button
                type="submit"
                disabled={loading || !!loadError || saving}
                className="w-full sm:w-auto"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar ficha
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
