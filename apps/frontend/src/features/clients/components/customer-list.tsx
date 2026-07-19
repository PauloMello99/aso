"use client"

import {
  MoreVertical,
  Pencil,
  Power,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Eye,
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
import type { Customer } from "../types"

interface CustomerListProps {
  customers: Customer[]
  onEdit: (customer: Customer) => void
  onToggleStatus: (customer: Customer) => void
  onDelete: (customer: Customer) => void
  onViewDetail: (customer: Customer) => void
}

type RowActions = Omit<CustomerListProps, "customers">

export function StatusBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        enabled
          ? "bg-success/10 text-success"
          : "bg-foreground/[0.06] text-foreground/40",
      )}
    >
      {enabled ? "Ativo" : "Inativo"}
    </span>
  )
}

function ActionMenu({
  customer,
  onEdit,
  onToggleStatus,
  onDelete,
  onViewDetail,
}: { customer: Customer } & RowActions) {
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
      <DropdownMenuContent align="end" className="min-w-[160px]">
        <DropdownMenuItem onClick={() => onViewDetail(customer)}>
          <Eye className="h-3.5 w-3.5 shrink-0" />
          Ver detalhes
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(customer)}>
          <Pencil className="h-3.5 w-3.5 shrink-0" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onToggleStatus(customer)}>
          <Power className="h-3.5 w-3.5 shrink-0" />
          {customer.enabled ? "Desativar" : "Ativar"}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => onDelete(customer)}>
          <Trash2 className="h-3.5 w-3.5 shrink-0" />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function CustomerCard({
  customer,
  onEdit,
  onToggleStatus,
  onDelete,
  onViewDetail,
}: { customer: Customer } & RowActions) {
  return (
    <div
      onClick={() => onViewDetail(customer)}
      className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium text-foreground">{customer.name}</span>
          <StatusBadge enabled={customer.enabled} />
        </div>
        <div className="mt-1 flex flex-col gap-1 text-sm text-foreground/40">
          {customer.email && (
            <span className="flex items-center gap-1.5 truncate">
              <Mail className="h-3 w-3 shrink-0" /> {customer.email}
            </span>
          )}
          {customer.phone && (
            <span className="flex items-center gap-1.5">
              <Phone className="h-3 w-3 shrink-0" /> {customer.phone}
            </span>
          )}
          {customer.city && (
            <span className="flex items-center gap-1.5 truncate">
              <MapPin className="h-3 w-3 shrink-0" /> {customer.city}
            </span>
          )}
          {!customer.email && !customer.phone && (
            <span className="text-foreground/20">Sem contato</span>
          )}
        </div>
      </div>
      <ActionMenu
        customer={customer}
        onEdit={onEdit}
        onToggleStatus={onToggleStatus}
        onDelete={onDelete}
        onViewDetail={onViewDetail}
      />
    </div>
  )
}

function CustomerRow({
  customer,
  onEdit,
  onToggleStatus,
  onDelete,
  onViewDetail,
}: { customer: Customer } & RowActions) {
  return (
    <TableRow
      onDoubleClick={() => onViewDetail(customer)}
      className="cursor-pointer"
    >
      <TableCell className="pl-4 font-medium text-foreground">
        {customer.name}
      </TableCell>
      <TableCell className="text-foreground/40">
        {customer.email ?? <span className="text-foreground/20">—</span>}
      </TableCell>
      <TableCell className="text-foreground/40">
        {customer.phone ?? <span className="text-foreground/20">—</span>}
      </TableCell>
      <TableCell className="text-foreground/40">
        {customer.city ?? <span className="text-foreground/20">—</span>}
      </TableCell>
      <TableCell>
        <StatusBadge enabled={customer.enabled} />
      </TableCell>
      <TableCell className="pr-4 text-right">
        <ActionMenu
          customer={customer}
          onEdit={onEdit}
          onToggleStatus={onToggleStatus}
          onDelete={onDelete}
          onViewDetail={onViewDetail}
        />
      </TableCell>
    </TableRow>
  )
}

export function CustomerList({
  customers,
  onEdit,
  onToggleStatus,
  onDelete,
  onViewDetail,
}: CustomerListProps) {
  if (customers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-foreground/[0.08] py-16 text-center">
        <p className="text-sm text-foreground/30">Nenhum cliente cadastrado ainda.</p>
        <p className="mt-1 text-xs text-foreground/20">
          Clique em &quot;Novo cliente&quot; para adicionar.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-3 sm:hidden">
        {customers.map((c) => (
          <CustomerCard
            key={c.id}
            customer={c}
            onEdit={onEdit}
            onToggleStatus={onToggleStatus}
            onDelete={onDelete}
            onViewDetail={onViewDetail}
          />
        ))}
      </div>

      <div className="hidden rounded-xl border border-foreground/[0.06] sm:block">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c) => (
              <CustomerRow
                key={c.id}
                customer={c}
                onEdit={onEdit}
                onToggleStatus={onToggleStatus}
                onDelete={onDelete}
                onViewDetail={onViewDetail}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
