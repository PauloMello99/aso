import Head from "next/head"
import {
  SITE_DEFAULT_DESCRIPTION,
  SITE_NAME,
  SITE_OG_IMAGE,
  SITE_URL,
} from "@/shared/config/site"

interface SeoProps {
  /** Título da página. Renderizado como "{title} · ASO" — omita o sufixo, é automático. */
  title: string
  description?: string
  /** Caminho relativo (ex.: "/legal/termos"). Usado para canonical e og:url. */
  path?: string
  /** Marca a página como não-indexável (rotas autenticadas, formulários com token, etc). */
  noindex?: boolean
  /** JSON-LD adicional (schema.org) a injetar como <script type="application/ld+json">. */
  jsonLd?: Record<string, unknown>
}

/**
 * Componente de SEO por página — title, description, canonical, Open Graph, Twitter Card
 * e robots. Usar em toda página pública; para rotas autenticadas, usar `noindex`.
 *
 * Não substitui o `<title>ASO</title>` global em `_app.tsx` — o Next mescla `<Head>`
 * aninhados, e o `<title>` mais específico (o de dentro da página) vence.
 */
export function Seo({ title, description, path, noindex, jsonLd }: SeoProps) {
  const fullTitle = `${title} · ${SITE_NAME}`
  const desc = description ?? SITE_DEFAULT_DESCRIPTION
  const url = path ? `${SITE_URL}${path}` : SITE_URL
  const robots = noindex ? "noindex, nofollow" : "index, follow"

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={SITE_OG_IMAGE} />
      <meta property="og:locale" content="pt_BR" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={SITE_OG_IMAGE} />

      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
    </Head>
  )
}
