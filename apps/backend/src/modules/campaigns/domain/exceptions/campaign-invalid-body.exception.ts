import { DomainException } from "../../../../common/exceptions/domain.exception";

/**
 * O corpo da campanha (documento Tiptap/ProseMirror em `campaigns.body`) violou
 * a allowlist FECHADA de nós/marcas/atributos (T6 rework, Fatia 3 — barreira que
 * reverte a D5 "texto puro" do ADR-0025). A mensagem é deliberadamente genérica:
 * nunca ecoa o input do cliente, apenas nomeia a classe da violação estrutural.
 */
export class CampaignInvalidBodyException extends DomainException {
  readonly code = "CAMPAIGN_INVALID_BODY";

  constructor(reason: string) {
    super(`Invalid campaign body: ${reason}`);
  }
}
