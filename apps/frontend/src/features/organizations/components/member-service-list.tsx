"use client";

import { formatBRL } from "@/features/cashier/lib/money";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  formatDate,
  StatusBadge,
} from "@/features/services/components/service-list";
import { serviceStatus, type Service } from "@/features/services/types";

// Variante somente-leitura de CustomerServiceHistoryList (clients feature),
// com coluna de comissão — ServiceList (services feature) não serve aqui
// porque sempre renderiza o menu de ações (editar/pagar/cancelar), incompatível
// com a tela de detalhe do membro (só leitura).
interface MemberServiceListProps {
  services: Service[];
}

function ServiceCard({ service }: { service: Service }) {
  const status = serviceStatus(service);
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium text-foreground">
            {service.typeName ?? "—"}
          </span>
          <StatusBadge status={status} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-foreground/40">
          <span>{service.customerName ?? "Cliente removido"}</span>
          <span>{formatDate(service.performedAt)}</span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <span className="font-semibold tabular-nums text-foreground">
            {formatBRL(service.amountCents)}
          </span>
          <span className="text-xs text-foreground/40">
            comissão {formatBRL(service.commissionCents)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function MemberServiceList({ services }: MemberServiceListProps) {
  if (services.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-foreground/[0.08] py-16 text-center">
        <p className="text-sm text-foreground/30">
          Nenhum serviço registrado para este membro ainda.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:hidden">
        {services.map((s) => (
          <ServiceCard key={s.id} service={s} />
        ))}
      </div>

      <div className="hidden rounded-xl border border-foreground/[0.06] sm:block">
        <Table className="min-w-[680px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Cliente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Execução</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="pr-4 text-right">Comissão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((s) => {
              const status = serviceStatus(s);
              return (
                <TableRow key={s.id}>
                  <TableCell className="pl-4 font-medium text-foreground">
                    {s.customerName ?? "Cliente removido"}
                  </TableCell>
                  <TableCell className="text-foreground/50">
                    {s.typeName ?? "—"}
                  </TableCell>
                  <TableCell className="text-foreground/40">
                    {formatDate(s.performedAt)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={status} />
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-foreground">
                    {formatBRL(s.amountCents)}
                  </TableCell>
                  <TableCell className="pr-4 text-right tabular-nums text-foreground/50">
                    {formatBRL(s.commissionCents)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
