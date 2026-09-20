// Vocabulário de hrefs de módulo do changelog. Fonte: ORG_NAV_SECTIONS em
// apps/frontend/src/features/dashboard/lib/nav.ts — manter em sincronia; o
// frontend falha aberto (link quebrado) para href desconhecido.
export const CHANGELOG_MODULE_HREFS = [
  "overview",
  "services",
  "anamnesis",
  "clients",
  "schedule",
  "stock",
  "cashier",
  "members",
  "campaigns",
  "settings",
  "support",
] as const;

export type ChangelogModuleHref = (typeof CHANGELOG_MODULE_HREFS)[number];

export type ChangelogAudience = "all" | "owners";

export interface ChangelogEntry {
  id: string;
  /** Inteiro monotônico crescente: maior = mais recente. */
  version: number;
  title: string;
  summary: string;
  highlights?: readonly string[];
  /** href de navegação do módulo relacionado (ex.: "stock"). */
  module?: ChangelogModuleHref;
  audience: ChangelogAudience;
  /** Data ISO (YYYY-MM-DD). */
  publishedAt: string;
  /** Versão de produto (MAJOR.MINOR.PATCH) do release que entregou o item. */
  semver: string;
}
