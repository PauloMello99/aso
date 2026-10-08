// Igual ao CHECK quote_forms_slug_check da migration 0087 (3..40 caracteres).
export const QUOTE_FORM_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

const RESERVED_QUOTE_FORM_SLUGS: ReadonlySet<string> = new Set([
  "admin",
  "api",
  "app",
  "www",
  "suporte",
  "support",
  "orcamento",
  "orcamentos",
  "login",
  "signup",
  "dashboard",
  "legal",
  "assessorink",
  "aso",
  "inkops",
  "public",
  "static",
  "help",
  "ajuda",
]);

export function normalizeQuoteFormSlug(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isReservedQuoteFormSlug(slug: string): boolean {
  return RESERVED_QUOTE_FORM_SLUGS.has(slug);
}

// So o formato (pattern + sem '--'); permite ao use-case distinguir "formato
// invalido" (422) de "reservado" (409).
export function hasValidQuoteFormSlugFormat(slug: string): boolean {
  return QUOTE_FORM_SLUG_PATTERN.test(slug) && !slug.includes("--");
}

export function isValidQuoteFormSlug(slug: string): boolean {
  return hasValidQuoteFormSlugFormat(slug) && !isReservedQuoteFormSlug(slug);
}
