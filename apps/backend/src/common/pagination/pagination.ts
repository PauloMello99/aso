/**
 * Offset-based pagination primitives shared by list use-cases across
 * modules (cashier, services, customers, materials, stock_movements, ...).
 * Pure functions, no Nest DI — semantics mirror
 * `modules/audit/application/use-cases/list-audit-logs.use-case.ts`.
 */

export interface PageRequest {
  page?: number;
  limit?: number;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
}

export interface PaginationBounds {
  defaultLimit: number;
  maxLimit: number;
}

/**
 * Resolves a raw page/limit request into clamped, safe values plus the
 * derived SQL offset. Invalid or non-finite values (NaN, Infinity) fall
 * back to defaults instead of throwing — pagination inputs are always
 * clamped, never rejected with a DomainException.
 */
export function resolvePageRequest(
  req: PageRequest | undefined,
  bounds: PaginationBounds,
): { page: number; limit: number; offset: number } {
  const rawPage = req?.page;
  const rawLimit = req?.limit;

  const safePage = rawPage !== undefined && Number.isFinite(rawPage) ? rawPage : 1;
  const safeLimit =
    rawLimit !== undefined && Number.isFinite(rawLimit) ? rawLimit : bounds.defaultLimit;

  const page = Math.max(1, safePage);
  const limit = Math.min(bounds.maxLimit, Math.max(1, safeLimit));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Builds the standard paginated envelope from a page of data, the total
 * row count, and the resolved page/limit.
 */
export function buildPaginated<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): Paginated<T> {
  return {
    data,
    total,
    page,
    pages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

/**
 * Parses a `@Query()` string param (e.g. `page`/`limit`) into a positive
 * integer, or `undefined` when the value is missing, empty, non-numeric,
 * non-integer, or not greater than zero.
 */
export function parsePageParam(value?: string): number | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }

  const trimmed = value.trim();
  const parsed = Number.parseInt(trimmed, 10);

  // Number.parseInt tolerates trailing/decimal garbage (e.g. "1.5" -> 1,
  // "1abc" -> 1); the round-trip check rejects anything that isn't a
  // clean positive integer string.
  if (!Number.isInteger(parsed) || parsed <= 0 || String(parsed) !== trimmed) {
    return undefined;
  }

  return parsed;
}
