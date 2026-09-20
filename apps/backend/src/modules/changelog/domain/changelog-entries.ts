import { ChangelogEntry } from "./changelog-entry";
import { shouldNotifyOwners } from "./changelog-semver";

// Ordenado por version DESC. `semver` é a versão de produto do release que
// entregou o item; os 4 itens do seed são baseline (catálogo histórico,
// pré-existente ao versionamento) e por isso compartilham "1.0.0".
export const CHANGELOG_ENTRIES = [
  {
    id: "low-stock-alert",
    version: 4,
    title: "Alerta de estoque baixo",
    summary:
      "Você é avisado quando um material chega ao estoque mínimo, uma vez por episódio.",
    highlights: [
      "Notificação no sistema ao cruzar o mínimo",
      "Novo aviso só depois que o estoque for reposto",
    ],
    module: "stock",
    audience: "owners",
    publishedAt: "2026-09-18",
    semver: "1.0.0",
  },
  {
    id: "installment-card-fee",
    version: 3,
    title: "Taxa de cartão parcelado",
    summary:
      "A taxa de cartão de crédito agora considera o número de parcelas do pagamento.",
    module: "cashier",
    audience: "owners",
    publishedAt: "2026-09-15",
    semver: "1.0.0",
  },
  {
    id: "member-payment",
    version: 2,
    title: "Pagamento a membros",
    summary:
      "Registre pagamentos feitos aos membros da equipe direto no caixa, com histórico próprio.",
    module: "cashier",
    audience: "owners",
    publishedAt: "2026-09-12",
    semver: "1.0.0",
  },
  {
    id: "campaign-delivery-report",
    version: 1,
    title: "Relatório de entrega das campanhas",
    summary:
      "Acompanhe entregas e e-mails devolvidos (bounce) de cada campanha enviada.",
    highlights: ["Relatório de entrega por campanha", "Registro de bounces"],
    module: "campaigns",
    audience: "owners",
    publishedAt: "2026-09-09",
    semver: "1.0.0",
  },
] as const satisfies readonly ChangelogEntry[];

// Itens com version <= corte (baseline) nunca notificam.
export const NOTIFY_FROM_VERSION = 4;

export function getLatestVersion(): number {
  return CHANGELOG_ENTRIES.reduce(
    (max, entry) => (entry.version > max ? entry.version : max),
    0,
  );
}

export function getEntriesNewerThan(
  version: number | null,
): readonly ChangelogEntry[] {
  const floor = version ?? 0;
  return CHANGELOG_ENTRIES.filter((entry) => entry.version > floor);
}

// Itens acima do corte cujo release é MAJOR/MINOR em relação ao item
// imediatamente anterior (por ordinal). Patch nunca notifica.
// `previous` é o item imediatamente anterior na lista COMPLETA (ordenada por
// ordinal), não na filtrada.
export function selectNotifiableEntries(
  entries: readonly ChangelogEntry[],
  cutoff: number,
): readonly ChangelogEntry[] {
  const byVersionAsc: readonly ChangelogEntry[] = [...entries].sort(
    (a, b) => a.version - b.version,
  );
  return byVersionAsc.filter((entry, index) => {
    if (entry.version <= cutoff) return false;
    const previous = index > 0 ? byVersionAsc[index - 1] : null;
    return shouldNotifyOwners(entry.semver, previous ? previous.semver : null);
  });
}

export function getNotifiableEntries(): readonly ChangelogEntry[] {
  return selectNotifiableEntries(CHANGELOG_ENTRIES, NOTIFY_FROM_VERSION);
}
