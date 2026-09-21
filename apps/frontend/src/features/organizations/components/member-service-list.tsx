"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Search } from "lucide-react";
import { useMoneyFormatter } from "@/shared/hooks/use-money-formatter";
import { PaginationBar } from "@/shared/components/pagination-bar";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { DatePicker } from "@/shared/components/ui/date-picker";
import {
  FilterField,
  FilterPopover,
} from "@/shared/components/ui/filter-popover";
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
import {
  serviceStatus,
  SERVICE_PAYMENT_METHODS,
  SERVICE_PAYMENT_METHOD_LABELS,
  SERVICE_STATUS_LABELS,
  type Service,
  type ServicePaymentMethod,
  type ServicesFilter,
  type ServiceStatus,
} from "@/features/services/types";
import {
  formatMemberServicesPeriod,
  patchServicesFilter,
} from "../lib/member-services-period";

const STATUS_VALUES: ServiceStatus[] = ["pending", "paid", "canceled"];

// Variante somente-leitura de CustomerServiceHistoryList (clients feature),
// com coluna de comissão — ServiceList (services feature) não serve aqui
// porque sempre renderiza o menu de ações (editar/pagar/cancelar), incompatível
// com a tela de detalhe do membro (só leitura).
interface MemberServiceListProps {
  services: Service[];
  // `total`/`page`/`pages` vêm do envelope paginado da API (`total` é o real,
  // não o tamanho da página).
  total: number;
  page: number;
  pages: number;
  loading: boolean;
  error: string | null;
  // Filtro controlado pela página (ela injeta `performedBy` fixo do membro ao
  // chamar useServices). Filtragem e paginação no servidor; `filter.page` é
  // resetado para 1 a cada mudança de filtro.
  filter: ServicesFilter;
  onFilterChange: Dispatch<SetStateAction<ServicesFilter>>;
}

function ServiceCard({ service }: { service: Service }) {
  const money = useMoneyFormatter();
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
            {money(service.amountCents)}
          </span>
          <span className="text-xs text-foreground/40">
            comissão {money(service.commissionCents)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function MemberServiceList({
  services,
  total,
  page,
  pages,
  loading,
  error,
  filter,
  onFilterChange,
}: MemberServiceListProps) {
  const money = useMoneyFormatter();
  const [search, setSearch] = useState("");

  const advancedCount =
    (filter.from ? 1 : 0) +
    (filter.to ? 1 : 0) +
    (filter.paymentMethod ? 1 : 0);
  const hasFilters = advancedCount > 0 || !!filter.status || !!filter.q;

  function updateFilter(patch: Partial<ServicesFilter>) {
    onFilterChange((f) => patchServicesFilter(f, patch));
  }

  function goToPage(next: number) {
    onFilterChange((f) => ({ ...f, page: next }));
  }

  function applySearch() {
    const q = search.trim() || undefined;
    if (q === filter.q) return;
    updateFilter({ q });
  }

  function clearAdvanced() {
    updateFilter({ from: undefined, to: undefined, paymentMethod: undefined });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <FilterField label="Buscar" className="sm:flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/30" />
            <Input
              placeholder="Cliente ou descrição…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySearch()}
              onBlur={applySearch}
              className="pl-9"
            />
          </div>
        </FilterField>
        <FilterField label="Status" className="sm:w-44">
          <Select
            value={filter.status ?? "all"}
            onValueChange={(v) =>
              updateFilter({
                status: v === "all" ? undefined : (v as ServiceStatus),
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {STATUS_VALUES.map((s) => (
                <SelectItem key={s} value={s}>
                  {SERVICE_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterPopover activeCount={advancedCount} onClear={clearAdvanced}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <FilterField label="De">
              <DatePicker
                value={filter.from ?? ""}
                onChange={(v) => updateFilter({ from: v || undefined })}
                placeholder="Início"
              />
            </FilterField>
            <FilterField label="Até">
              <DatePicker
                value={filter.to ?? ""}
                onChange={(v) => updateFilter({ to: v || undefined })}
                placeholder="Fim"
              />
            </FilterField>
          </div>
          <FilterField label="Método de pagamento">
            <Select
              value={filter.paymentMethod ?? "all"}
              onValueChange={(v) =>
                updateFilter({
                  paymentMethod:
                    v === "all" ? undefined : (v as ServicePaymentMethod),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os métodos</SelectItem>
                {SERVICE_PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {SERVICE_PAYMENT_METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
        </FilterPopover>
      </div>

      {!error && !loading && (
        <p className="text-xs text-foreground/40">
          {formatMemberServicesPeriod(filter)} · {total}{" "}
          {total === 1 ? "serviço" : "serviços"}
        </p>
      )}

      {error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl border border-foreground/[0.06] bg-foreground/[0.02]"
            />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="rounded-xl border border-dashed border-foreground/[0.08] py-16 text-center">
          <p className="text-sm text-foreground/30">
            {hasFilters
              ? "Nenhum serviço encontrado com esses filtros."
              : "Nenhum serviço registrado para este membro ainda."}
          </p>
        </div>
      ) : (
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
                        <span
                          title={s.customerName ?? undefined}
                          className="block max-w-[14rem] truncate"
                        >
                          {s.customerName ?? "Cliente removido"}
                        </span>
                      </TableCell>
                      <TableCell className="text-foreground/50">
                        <span
                          title={s.typeName ?? undefined}
                          className="block max-w-[10rem] truncate"
                        >
                          {s.typeName ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-foreground/40">
                        {formatDate(s.performedAt)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={status} />
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-foreground">
                        {money(s.amountCents)}
                      </TableCell>
                      <TableCell className="pr-4 text-right tabular-nums text-foreground/50">
                        {money(s.commissionCents)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <PaginationBar
            page={page}
            pages={pages}
            total={total}
            onPageChange={goToPage}
            itemLabel="serviço"
          />
        </>
      )}
    </div>
  );
}
