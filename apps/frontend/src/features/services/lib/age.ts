export interface Ymd {
  y: number
  m: number
  d: number
}

export type AgeCheck = "ok" | "minor" | "unknown"

export function parseYmd(value: string): Ymd | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  return { y, m, d }
}

export function ageAt(birthDate: string, atYmd: string): number | null {
  const birth = parseYmd(birthDate)
  const at = parseYmd(atYmd)
  if (!birth || !at) return null

  let age = at.y - birth.y
  if (at.m < birth.m || (at.m === birth.m && at.d < birth.d)) {
    age--
  }
  return age
}

export function todayYmd(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function checkAgeRequirement(
  birthDate: string,
  performedAt: string,
): AgeCheck {
  const atYmd = performedAt || todayYmd()
  const age = ageAt(birthDate, atYmd)
  if (age === null) return "unknown"
  return age < 18 ? "minor" : "ok"
}
