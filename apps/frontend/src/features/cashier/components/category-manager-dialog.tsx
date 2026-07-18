"use client"

import { useEffect, useState } from "react"
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react"
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
import { Badge } from "@/shared/components/ui/badge"
import { cn } from "@/shared/lib/utils"
import type { TransactionCategory } from "../types"

interface CategoryManagerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: TransactionCategory[]
  onCreate: (name: string) => Promise<TransactionCategory>
  onUpdate: (id: string, name: string) => Promise<TransactionCategory>
  onDelete: (id: string) => Promise<void>
}

export function CategoryManagerDialog({
  open,
  onOpenChange,
  categories,
  onCreate,
  onUpdate,
  onDelete,
}: CategoryManagerDialogProps) {
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setNewName("")
      setEditingId(null)
      setEditingName("")
    }
  }, [open])

  async function handleCreate() {
    const trimmed = newName.trim()
    if (!trimmed) return
    setCreating(true)
    try {
      await onCreate(trimmed)
      setNewName("")
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Não foi possível criar a categoria.",
      )
    } finally {
      setCreating(false)
    }
  }

  function startEdit(category: TransactionCategory) {
    setEditingId(category.id)
    setEditingName(category.name)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingName("")
  }

  async function handleSaveEdit(id: string) {
    const trimmed = editingName.trim()
    if (!trimmed) return
    setSavingId(id)
    try {
      await onUpdate(id, trimmed)
      setEditingId(null)
      setEditingName("")
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Não foi possível renomear a categoria.",
      )
    } finally {
      setSavingId(null)
    }
  }

  async function handleDelete(category: TransactionCategory) {
    if (!confirm(`Excluir "${category.name}"? Esta ação não pode ser desfeita.`))
      return
    setDeletingId(category.id)
    try {
      await onDelete(category.id)
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Não foi possível excluir a categoria.",
      )
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Categorias de lançamento</DialogTitle>
          <DialogDescription>
            Crie, renomeie ou exclua categorias usadas para classificar
            entradas e saídas do caixa.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Input
              placeholder="Nova categoria"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  void handleCreate()
                }
              }}
            />
            <Button
              type="button"
              size="icon"
              disabled={!newName.trim() || creating}
              onClick={() => void handleCreate()}
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          {categories.length === 0 ? (
            <p className="py-6 text-center text-sm text-foreground/40">
              Nenhuma categoria cadastrada.
            </p>
          ) : (
            <ul className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
              {categories.map((category) => {
                const isEditing = editingId === category.id
                const isSaving = savingId === category.id
                const isDeleting = deletingId === category.id

                return (
                  <li
                    key={category.id}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-2",
                    )}
                  >
                    {isEditing ? (
                      <>
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          autoFocus
                          autoComplete="off"
                          className="h-8"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              void handleSaveEdit(category.id)
                            }
                            if (e.key === "Escape") {
                              e.preventDefault()
                              cancelEdit()
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          disabled={!editingName.trim() || isSaving}
                          onClick={() => void handleSaveEdit(category.id)}
                          title="Salvar"
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          disabled={isSaving}
                          onClick={cancelEdit}
                          title="Cancelar"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 truncate text-sm text-foreground/80">
                          {category.name}
                        </span>
                        {category.isProtected && (
                          <Badge variant="secondary">Protegida</Badge>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => startEdit(category)}
                          title="Renomear"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!category.isProtected && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                            disabled={isDeleting}
                            onClick={() => void handleDelete(category)}
                            title="Excluir"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  )
}
