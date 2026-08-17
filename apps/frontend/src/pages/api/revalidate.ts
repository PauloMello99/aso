import type { NextApiRequest, NextApiResponse } from "next"

const ALLOWED_PATHS = new Set(["/"])

interface RevalidateBody {
  path?: unknown
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    res.status(405).end()
    return
  }

  const expectedSecret = process.env.REVALIDATE_SECRET
  const providedSecret = req.headers["x-revalidate-secret"]

  if (!expectedSecret || providedSecret !== expectedSecret) {
    res.status(401).end()
    return
  }

  const body = req.body as RevalidateBody
  const path = body?.path

  if (typeof path !== "string" || !ALLOWED_PATHS.has(path)) {
    res.status(400).json({ error: "path inválido" })
    return
  }

  try {
    await res.revalidate(path)
    res.status(200).json({ revalidated: true })
  } catch {
    res.status(500).json({ error: "falha ao revalidar" })
  }
}
