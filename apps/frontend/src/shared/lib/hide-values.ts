export function hideValuesStorageKey(orgId: string): string {
  return `inkops_hide_values_${orgId}`
}

export function maskAmount(formatted: string): string {
  return formatted.replace(/\d/g, "•")
}
