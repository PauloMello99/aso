"use client"

import {
  MoreVertical,
  PackagePlus,
  Pencil,
  SlidersHorizontal,
  History,
  Trash2,
  AlertTriangle,
  Archive,
  ArchiveRestore,
} from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { cn } from "@/shared/lib/utils"
import { isLowStock } from "../hooks/use-materials"
import { LowStockBadge } from "./low-stock-badge"
import type { Material } from "../types"

interface MaterialListProps {
  materials: Material[]
  onRestock: (material: Material) => void
  onEdit: (material: Material) => void
  onAdjust: (material: Material) => void
  onHistory: (material: Material) => void
  onDelete: (material: Material) => void
  onArchive: (material: Material) => void
}

interface ActionMenuProps {
  material: Material
  onRestock: () => void
  onEdit: () => void
  onAdjust: () => void
  onHistory: () => void
  onDelete: () => void
  onArchive: () => void
}

function ActionMenu({
  material,
  onRestock,
  onEdit,
  onAdjust,
  onHistory,
  onDelete,
  onArchive,
}: ActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Ações</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[170px]">
        <DropdownMenuItem
          className="text-success focus:bg-success/10"
          onClick={onRestock}
        >
          <PackagePlus className="h-3.5 w-3.5 shrink-0" />
          Repor estoque
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5 shrink-0" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAdjust}>
          <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
          Ajustar estoque
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onHistory}>
          <History className="h-3.5 w-3.5 shrink-0" />
          Histórico
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onArchive}>
          {material.archivedAt ? (
            <>
              <ArchiveRestore className="h-3.5 w-3.5 shrink-0" />
              Desarquivar
            </>
          ) : (
            <>
              <Archive className="h-3.5 w-3.5 shrink-0" />
              Arquivar
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5 shrink-0" />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MaterialCard({
  material,
  onRestock,
  onEdit,
  onAdjust,
  onHistory,
  onDelete,
  onArchive,
}: {
  material: Material
} & Omit<MaterialListProps, "materials">) {
  const low = isLowStock(material)
  const qty = parseFloat(material.stockQuantity)

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-xl border p-4 transition-colors",
        low
          ? "border-primary/25 bg-primary/[0.04]"
          : "border-foreground/[0.06] bg-foreground/[0.02]",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {low && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-primary" />}
          <span className="truncate font-medium text-foreground">{material.name}</span>
          {material.shareable && (
            <span className="inline-flex items-center rounded-full bg-info/10 px-2 py-0.5 text-xs font-medium text-info">
              Compartilhável
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className={cn("font-semibold tabular-nums", low ? "text-primary" : "text-foreground")}>
            {qty.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </span>
          {parseFloat(material.minimumQuantity) > 0 && (
            <span className="text-foreground/30">
              mín.{" "}
              {parseFloat(material.minimumQuantity).toLocaleString("pt-BR", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}
            </span>
          )}
        </div>
        {low && (
          <div className="mt-2">
            <LowStockBadge />
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-success hover:bg-success/10 hover:text-success/80"
          onClick={() => onRestock(material)}
          title="Repor estoque"
        >
          <PackagePlus className="h-4 w-4" />
        </Button>
        <ActionMenu
          material={material}
          onRestock={() => onRestock(material)}
          onEdit={() => onEdit(material)}
          onAdjust={() => onAdjust(material)}
          onHistory={() => onHistory(material)}
          onDelete={() => onDelete(material)}
          onArchive={() => onArchive(material)}
        />
      </div>
    </div>
  )
}

function MaterialRow({
  material,
  onRestock,
  onEdit,
  onAdjust,
  onHistory,
  onDelete,
  onArchive,
}: {
  material: Material
} & Omit<MaterialListProps, "materials">) {
  const low = isLowStock(material)
  const qty = parseFloat(material.stockQuantity)
  const minQty = parseFloat(material.minimumQuantity)

  return (
    <TableRow className={cn(low && "bg-primary/[0.03]")}>
      <TableCell className="pl-4">
        <div className="flex items-center gap-2">
          {low && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-primary" />}
          <span className="font-medium text-foreground">{material.name}</span>
        </div>
      </TableCell>
      <TableCell>
        {material.shareable ? (
          <span className="inline-flex items-center rounded-full bg-info/10 px-2 py-0.5 text-xs font-medium text-info">
            Compartilhável
          </span>
        ) : (
          <span className="text-foreground/20">—</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <span
          className={cn(
            "font-semibold tabular-nums",
            low ? "text-primary" : "text-foreground",
          )}
        >
          {qty.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
        </span>
      </TableCell>
      <TableCell className="text-right text-foreground/40">
        {minQty > 0 ? (
          minQty.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
        ) : (
          <span className="text-foreground/20">—</span>
        )}
      </TableCell>
      <TableCell className="text-foreground/40">
        {material.costPerUnit ? (
          `R$ ${parseFloat(material.costPerUnit).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ) : (
          <span className="text-foreground/20">—</span>
        )}
      </TableCell>
      <TableCell className="pr-4">
        <div className="flex items-center justify-end gap-1">
          {low && <LowStockBadge compact />}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-success hover:bg-success/10 hover:text-success/80"
            onClick={() => onRestock(material)}
            title="Repor estoque"
          >
            <PackagePlus className="h-4 w-4" />
          </Button>
          <ActionMenu
            material={material}
            onRestock={() => onRestock(material)}
            onEdit={() => onEdit(material)}
            onAdjust={() => onAdjust(material)}
            onHistory={() => onHistory(material)}
            onDelete={() => onDelete(material)}
            onArchive={() => onArchive(material)}
          />
        </div>
      </TableCell>
    </TableRow>
  )
}

export function MaterialList({
  materials,
  onRestock,
  onEdit,
  onAdjust,
  onHistory,
  onDelete,
  onArchive,
}: MaterialListProps) {
  if (materials.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-foreground/[0.08] py-16 text-center">
        <p className="text-sm text-foreground/30">Nenhum material cadastrado ainda.</p>
        <p className="mt-1 text-xs text-foreground/20">
          Clique em &quot;Novo material&quot; para adicionar.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-3 sm:hidden">
        {materials.map((m) => (
          <MaterialCard
            key={m.id}
            material={m}
            onRestock={onRestock}
            onEdit={onEdit}
            onAdjust={onAdjust}
            onHistory={onHistory}
            onDelete={onDelete}
            onArchive={onArchive}
          />
        ))}
      </div>

      <div className="hidden rounded-xl border border-foreground/[0.06] sm:block">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Material</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <TableHead className="text-right">Mínimo</TableHead>
              <TableHead>Custo/un</TableHead>
              <TableHead className="pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.map((m) => (
              <MaterialRow
                key={m.id}
                material={m}
                onRestock={onRestock}
                onEdit={onEdit}
                onAdjust={onAdjust}
                onHistory={onHistory}
                onDelete={onDelete}
                onArchive={onArchive}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
