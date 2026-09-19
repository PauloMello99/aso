import { ChangelogEntry } from "./changelog-entry";

// Ordenado por version DESC. Itens do catálogo histórico nunca disparam e-mail
// (notifyOwners: false); só novas entradas publicadas com notifyOwners: true.
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
    notifyOwners: false,
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
    notifyOwners: false,
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
    notifyOwners: false,
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
    notifyOwners: false,
  },
] as const satisfies readonly ChangelogEntry[];

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
