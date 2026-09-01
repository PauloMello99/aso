import type { AuditAction } from "../types"

type AuditActionVariant = "default" | "secondary" | "destructive" | "outline"

// Espelha os 18 valores de `auditActionEnum` (apps/backend/src/database/schema/enums.ts).
// Ao adicionar um valor no enum do backend, sincronizar a union `AuditAction` e estes
// dois mapas — o `check-types` cobra exaustividade por serem `Record<AuditAction, ...>`.
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  create: "Criação",
  update: "Atualização",
  delete: "Remoção",
  invite_sent: "Convite enviado",
  invite_accepted: "Convite aceito",
  subscription_changed: "Assinatura",
  anamnesis_invite_sent: "Anamnese: convite enviado",
  customer_self_registration_invite_sent: "Cliente: convite de autocadastro",
  customer_self_registered: "Cliente: autocadastro concluído",
  customer_update_invite_sent: "Cliente: convite de atualização",
  customer_self_updated: "Cliente: atualização pelo cliente",
  anamnesis_invite_resent: "Anamnese: convite reenviado",
  anamnesis_copy_sent: "Anamnese: cópia enviada",
  cashier_transaction_created: "Caixa: lançamento",
  cashier_fees_updated: "Caixa: taxas",
  cashier_commissions_updated: "Caixa: comissões",
  org_admin_access: "Admin: acesso à org",
  campaign_settings_updated: "Configuração de campanhas atualizada",
}

export const AUDIT_ACTION_VARIANTS: Record<AuditAction, AuditActionVariant> = {
  create: "default",
  update: "secondary",
  delete: "destructive",
  invite_sent: "outline",
  invite_accepted: "outline",
  subscription_changed: "secondary",
  anamnesis_invite_sent: "outline",
  customer_self_registration_invite_sent: "outline",
  customer_self_registered: "default",
  customer_update_invite_sent: "outline",
  customer_self_updated: "default",
  anamnesis_invite_resent: "outline",
  anamnesis_copy_sent: "outline",
  cashier_transaction_created: "default",
  cashier_fees_updated: "secondary",
  cashier_commissions_updated: "secondary",
  org_admin_access: "secondary",
  campaign_settings_updated: "secondary",
}

// Deriva as opções de filtro do próprio mapa — assim um novo valor de enum entra
// no dropdown sem um terceiro ponto para esquecer de atualizar.
export const AUDIT_ACTION_OPTIONS = Object.keys(
  AUDIT_ACTION_LABELS,
) as AuditAction[]

// Pontos de consumo únicos para rótulo e variante: aceitam `string` cru (o backend pode
// adicionar um valor ao enum antes de o frontend sincronizar a union) e fazem o fallback
// aqui, em vez de repetir `?? action` / `?? "outline"` em cada componente.
export function getAuditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action as AuditAction] ?? action
}

export function getAuditActionVariant(action: string): AuditActionVariant {
  return AUDIT_ACTION_VARIANTS[action as AuditAction] ?? "outline"
}
