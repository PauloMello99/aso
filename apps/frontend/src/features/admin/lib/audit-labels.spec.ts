import { describe, expect, it } from "vitest"
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ACTION_OPTIONS,
  AUDIT_ACTION_VARIANTS,
  getAuditActionLabel,
  getAuditActionVariant,
} from "./audit-labels"

describe("audit-labels", () => {
  it("rotula a ação org_admin_access emitida em acesso via super_admin", () => {
    expect(AUDIT_ACTION_LABELS.org_admin_access).toBe("Admin: acesso à org")
    expect(AUDIT_ACTION_VARIANTS.org_admin_access).toBe("secondary")
  })

  it("rotula a ação campaign_settings_updated emitida ao salvar a config de campanhas", () => {
    expect(AUDIT_ACTION_LABELS.campaign_settings_updated).toBe(
      "Configuração de campanhas atualizada",
    )
    expect(AUDIT_ACTION_VARIANTS.campaign_settings_updated).toBe("secondary")
  })

  it("rotula a ação campaign_email_bounced emitida quando o e-mail de campanha é rejeitado", () => {
    expect(AUDIT_ACTION_LABELS.campaign_email_bounced).toBe(
      "Campanha: e-mail rejeitado",
    )
    expect(AUDIT_ACTION_VARIANTS.campaign_email_bounced).toBe("secondary")
  })

  it("rotula a ação quote_request_closed emitida ao responder um pedido de orçamento", () => {
    expect(AUDIT_ACTION_LABELS.quote_request_closed).toBe(
      "Orçamento: pedido respondido",
    )
    expect(AUDIT_ACTION_VARIANTS.quote_request_closed).toBe("secondary")
    expect(AUDIT_ACTION_OPTIONS).toContain("quote_request_closed")
  })

  it("cobre os 20 valores de auditActionEnum nos dois mapas", () => {
    expect(Object.keys(AUDIT_ACTION_LABELS)).toHaveLength(20)
    expect(Object.keys(AUDIT_ACTION_VARIANTS)).toHaveLength(20)
    for (const action of AUDIT_ACTION_OPTIONS) {
      expect(AUDIT_ACTION_LABELS[action]).toBeTruthy()
      expect(AUDIT_ACTION_VARIANTS[action]).toBeTruthy()
    }
  })

  it("resolve rótulo e variante pelos mapas para ações conhecidas", () => {
    expect(getAuditActionLabel("org_admin_access")).toBe("Admin: acesso à org")
    expect(getAuditActionVariant("org_admin_access")).toBe("secondary")
    expect(getAuditActionLabel("delete")).toBe("Remoção")
    expect(getAuditActionVariant("delete")).toBe("destructive")
  })

  it('faz fallback para a própria ação / "outline" quando o valor não está mapeado', () => {
    // Valor de enum que o backend venha a adicionar antes de o frontend sincronizar a
    // union — os helpers são o ponto de consumo real, usados nos componentes de auditoria.
    expect(getAuditActionLabel("future_backend_action")).toBe(
      "future_backend_action",
    )
    expect(getAuditActionVariant("future_backend_action")).toBe("outline")
  })
})
