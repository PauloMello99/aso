export interface ShareInput {
  name: string
  cents: number
}

export interface ShareRow extends ShareInput {
  /** Percentual com 1 casa decimal (ex.: 33.3); a soma fecha em 100. */
  percent: number
}

/**
 * Participação de cada item sobre o total (somente valores positivos entram no
 * total). Usa o maior resto em décimos de ponto percentual para que a soma dos
 * percentuais exibidos feche em 100,0. Total 0 -> todos 0, sem divisão por zero.
 */
export function computeShares(rows: ShareInput[]): ShareRow[] {
  const total = rows.reduce((acc, r) => acc + (r.cents > 0 ? r.cents : 0), 0)
  if (total <= 0) return rows.map((r) => ({ ...r, percent: 0 }))

  const items = rows.map((row, index) => {
    const exact = row.cents > 0 ? (row.cents / total) * 1000 : 0
    return { row, index, tenths: Math.floor(exact), rem: exact - Math.floor(exact) }
  })
  let missing = 1000 - items.reduce((acc, it) => acc + it.tenths, 0)

  const candidates = items
    .filter((it) => it.row.cents > 0)
    .sort((a, b) => b.rem - a.rem)
  for (let k = 0; missing > 0 && candidates.length > 0; k += 1) {
    const target = candidates[k % candidates.length]
    if (target) target.tenths += 1
    missing -= 1
  }

  return items.map((it) => ({ ...it.row, percent: it.tenths / 10 }))
}
