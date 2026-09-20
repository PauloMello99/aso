export function slugifyName(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "membro";
}

// O id curto (primeiros 8 hex do uuid) distingue dois recibos do mesmo dia.
export function receiptFilename(
  memberName: string,
  issuedAt: Date,
  paymentId: string,
): string {
  const shortId = paymentId.replace(/-/g, "").slice(0, 8);
  return `recibo-pagamento-${slugifyName(memberName)}-${issuedAt
    .toISOString()
    .slice(0, 10)}-${shortId}.pdf`;
}

export function reportFilename(
  memberName: string,
  fromDate: string,
  toDate: string,
): string {
  return `relatorio-${slugifyName(memberName)}-${fromDate}-${toDate}.pdf`;
}
