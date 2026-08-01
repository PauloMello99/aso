import type { GetServerSideProps } from "next"
import { SITE_URL } from "@/shared/config/site"

const BODY = `User-agent: *
Disallow: /dashboard/
Disallow: /admin/
Disallow: /anamnesis/
Disallow: /invite/
Disallow: /auth/recover
Disallow: /auth/reset-password

Sitemap: ${SITE_URL}/sitemap.xml
`

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader("Content-Type", "text/plain")
  res.write(BODY)
  res.end()
  return { props: {} }
}

export default function Robots() {
  return null
}
