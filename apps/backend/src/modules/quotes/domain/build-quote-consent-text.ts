// Texto de consentimento gerado no SERVIDOR e versionado (ADR-0018 §3): o texto
// exibido e o snapshot gravado vem daqui, nunca do cliente.
//
// PENDENTE de aprovacao juridica: e uma MINUTA tecnica. O sufixo "minuta" na
// versao deixa isso explicito; ao aprovar o texto, trocar a versao (a validacao
// de versao no submit forca o cliente a recarregar a pagina).
export const QUOTE_CONSENT_VERSION = "quote-v1-minuta-2026-10";

export type QuoteConsentTexts = {
  privacy: string;
  contactRetention: string;
};

export function buildQuoteConsentTexts(input: {
  orgName: string;
}): QuoteConsentTexts {
  const { orgName } = input;
  return {
    privacy:
      `O estúdio ${orgName} é o controlador dos dados deste pedido e o ASO é o operador. ` +
      "Usaremos seu nome, telefone, e-mail, a descrição da ideia e as imagens enviadas " +
      "somente para responder ao seu pedido de orçamento. " +
      "As imagens são apagadas quando o pedido é encerrado e, se não for tratado, " +
      "o pedido é descartado em até 30 dias. " +
      "Saiba mais na Política de Privacidade (/legal/privacidade).",
    contactRetention:
      `Autorizo o estúdio ${orgName} a manter meu nome, telefone e e-mail por até 30 dias ` +
      "após o encerramento do pedido sem agendamento, para contato futuro. " +
      "Posso revogar esta autorização a qualquer momento.",
  };
}

export function buildQuoteConsentSnapshot(input: {
  orgName: string;
  contactRetentionAccepted: boolean;
}): string {
  const texts = buildQuoteConsentTexts({ orgName: input.orgName });
  const sections = [`[Privacidade] ${texts.privacy}`];
  if (input.contactRetentionAccepted) {
    sections.push(`[Retenção de contato] ${texts.contactRetention}`);
  }
  return sections.join("\n\n");
}
