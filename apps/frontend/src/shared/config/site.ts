/**
 * Fonte única de dados do site — domínio, nome, descrição padrão, e-mails de contato.
 * Usado pelo componente `Seo`, pelo layout de `<head>`, robots.txt e sitemap.xml.
 *
 * `NEXT_PUBLIC_SITE_URL` permite apontar staging/preview para outro host sem editar
 * código; produção usa o default abaixo.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://assessorink-so.com"

export const SITE_NAME = "ASO"

export const SITE_DEFAULT_TITLE = "ASO — Gestão para estúdios"

export const SITE_DEFAULT_DESCRIPTION =
  "Agendamentos, clientes, estoque e caixa em um único lugar. Gestão completa para estúdios criativos."

export const SITE_OG_IMAGE = `${SITE_URL}/og-image.png`

export const SITE_EMAILS = {
  noReply: "no-reply@assessorink-so.com",
  suporte: "suporte@assessorink-so.com",
  contato: "contato@assessorink-so.com",
} as const
