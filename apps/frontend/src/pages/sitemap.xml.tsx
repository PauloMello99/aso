import type { GetServerSideProps } from "next"
import { SITE_URL } from "@/shared/config/site"

const PUBLIC_ROUTES = [
  { path: "/", priority: "1.0" },
  { path: "/legal/termos", priority: "0.3" },
  { path: "/legal/privacidade", priority: "0.3" },
  { path: "/legal/cookies", priority: "0.3" },
  { path: "/legal/tratamento-de-dados", priority: "0.3" },
  { path: "/auth/login", priority: "0.5" },
  { path: "/auth/signup", priority: "0.7" },
]

function buildSitemap(): string {
  const urls = PUBLIC_ROUTES.map(
    ({ path, priority }) =>
      `  <url><loc>${SITE_URL}${path}</loc><priority>${priority}</priority></url>`,
  ).join("\n")

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader("Content-Type", "application/xml")
  res.write(buildSitemap())
  res.end()
  return { props: {} }
}

export default function Sitemap() {
  return null
}
