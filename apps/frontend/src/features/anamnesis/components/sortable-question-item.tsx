"use client"

import { Controller, type Control } from "react-hook-form"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, X } from "lucide-react"
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/shared/components/ui/form"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Switch } from "@/shared/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { cn } from "@/shared/lib/utils"
import {
  ANAMNESIS_QUESTION_TYPE_LABELS,
  ANAMNESIS_QUESTION_TYPES,
} from "../types"
import type { AnamnesisFormValues } from "../schemas/anamnesis.schemas"

interface SortableQuestionItemProps {
  id: string
  index: number
  control: Control<AnamnesisFormValues>
  onRemove: () => void
}

export function SortableQuestionItem({
  id,
  index,
  control,
  onRemove,
}: SortableQuestionItemProps) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-3 sm:p-4",
        isDragging && "opacity-60 shadow-lg",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label="Reordenar pergunta"
          className={cn(
            "flex shrink-0 cursor-grab touch-none items-center justify-center rounded-md p-2 text-foreground/40 hover:text-foreground/70 active:cursor-grabbing",
          )}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <FormField
          control={control}
          name={`questions.${index}.label`}
          render={({ field: labelField }) => (
            <FormItem className="flex-1">
              <FormControl>
                <Input
                  placeholder="Ex.: Você tem alguma alergia?"
                  aria-label="Texto da pergunta"
                  {...labelField}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={onRemove}
            title="Remover pergunta"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FormField
          control={control}
          name={`questions.${index}.type`}
          render={({ field: typeField }) => (
            <FormItem>
              <Select value={typeField.value} onValueChange={typeField.onChange}>
                <FormControl>
                  <SelectTrigger className="sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ANAMNESIS_QUESTION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {ANAMNESIS_QUESTION_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <Controller
          control={control}
          name={`questions.${index}.required`}
          render={({ field: requiredField }) => (
            <label className="flex items-center gap-2 text-sm text-foreground/60">
              <Switch
                checked={requiredField.value}
                onCheckedChange={requiredField.onChange}
              />
              Obrigatória
            </label>
          )}
        />
      </div>
    </li>
  )
}
