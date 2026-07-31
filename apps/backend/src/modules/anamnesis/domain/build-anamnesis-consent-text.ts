/**
 * Texto de consentimento específico e destacado exibido ao titular antes de assinar a
 * ficha de anamnese (LGPD art. 11, I — dado sensível de saúde). Gerado no servidor e
 * NUNCA confiado ao cliente: é snapshotado em `anamnesis_responses.consent_text_snapshot`
 * no momento do envio e impresso integralmente no PDF assinado, o mesmo padrão já usado
 * para `questions_snapshot`.
 *
 * A versão retornada deve bater com a versão enviada pelo formulário público
 * (`SubmitAnamnesisResponseDto.consentVersion`); se a página ficou aberta durante uma
 * atualização deste texto, a submissão é rejeitada e o titular precisa recarregar.
 */
export const ANAMNESIS_CONSENT_VERSION = "2026-07-27";

export interface AnamnesisConsentTextInput {
  orgName: string;
}

export interface AnamnesisConsentText {
  version: string;
  text: string;
}

export function buildAnamnesisConsentText({
  orgName,
}: AnamnesisConsentTextInput): AnamnesisConsentText {
  const text = [
    `Este formulário é operado por ${orgName} ("Estúdio"), que é o controlador dos dados pessoais informados abaixo, nos termos da Lei Geral de Proteção de Dados (Lei 13.709/2018 — LGPD). A plataforma ASO atua apenas como operadora, tratando esses dados conforme as instruções do Estúdio.`,
    `As respostas desta ficha de anamnese, incluindo informações sobre sua saúde, são dados pessoais sensíveis (LGPD, art. 5º, II). Ao marcar a opção de aceite e assinar abaixo, você consente de forma específica e destacada com o tratamento desses dados pela finalidade de avaliar sua aptidão para o procedimento e manter registro do atendimento (LGPD, art. 11, I).`,
    `Para fins de comprovação da autoria desta assinatura eletrônica, registramos também a data e hora do envio, o endereço IP e as informações do navegador utilizados.`,
    `Os dados serão mantidos pelo Estúdio pelo tempo necessário ao cumprimento de suas obrigações e poderão ser eliminados ou anonimizados após esse período. Para exercer seus direitos de titular (acesso, correção, eliminação, entre outros), entre em contato diretamente com o Estúdio.`,
  ].join("\n\n");

  return { version: ANAMNESIS_CONSENT_VERSION, text };
}
