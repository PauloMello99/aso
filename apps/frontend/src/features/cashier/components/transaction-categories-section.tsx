"use client"

import { useState } from "react"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { cn } from "@/shared/lib/utils"
import { useTransactionCategories } from "../hooks/use-transaction-categories"
import { categoryErrorMessage } from "../lib/error-messages"
import { TransactionCategorySheet } from "./transaction-category-sheet"
import type { TransactionCategory } from "../types"

interface TransactionCategoriesSectionProps {
  orgId: string
}

function CategoryBadge({ category }: { category: TransactionCategory }) {
  if (category.systemKey !== null) {
    return <Badge variant="secondary">Sistema</Badge>
  }
  if (category.isProtected) {
    return <Badge variant="secondary">Protegida</Badge>
  }
  return null
}

export function TransactionCategoriesSection({
  orgId,
}: TransactionCategoriesSectionProps) {
  const {
    categories,
    loading,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useTransactionCategories(orgId)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<TransactionCategory | null>(null)
  const [deleting, setDeleting] = useState<TransactionCategory | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setSheetOpen(true)
  }

  function openEdit(category: TransactionCategory) {
    setEditing(category)
    setSheetOpen(true)
  }

  function openDelete(category: TransactionCategory) {
    setDeleteError(null)
    setDeleting(category)
  }

  async function handleConfirmDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      await deleteCategory(deleting.id)
      setDeleting(null)
    } catch (err) {
      setDeleteError(categoryErrorMessage(err))
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="h-4 w-4" />
          Nova categoria
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-foreground/40">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Carregando…
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-foreground/[0.08] py-16 text-center">
          <p className="text-sm text-foreground/30">
            Nenhuma categoria cadastrada ainda.
          </p>
          <p className="mt-1 text-xs text-foreground/20">
            Clique em &quot;Nova categoria&quot; para adicionar.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:hidden">
            {categories.map((category) => (
              <div
                key={category.id}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4",
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate font-medium text-foreground">
                    {category.name}
                  </span>
                  <CategoryBadge category={category} />
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(category)}
                    title="Renomear"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {!category.isProtected && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => openDelete(category)}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden rounded-xl border border-foreground/[0.06] sm:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Categoria</TableHead>
                  <TableHead className="pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {category.name}
                        </span>
                        <CategoryBadge category={category} />
                      </div>
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(category)}
                          title="Renomear"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!category.isProtected && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => openDelete(category)}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <TransactionCategorySheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        category={editing}
        onCreate={createCategory}
        onUpdate={updateCategory}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => {
          if (!o) {
            setDeleting(null)
            setDeleteError(null)
          }
        }}
        title="Excluir categoria"
        description={
          deleting
            ? `Excluir "${deleting.name}"? Esta ação não pode ser desfeita.`
            : undefined
        }
        confirmLabel="Excluir"
        destructive
        loading={deleteLoading}
        error={deleteError}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  )
}
