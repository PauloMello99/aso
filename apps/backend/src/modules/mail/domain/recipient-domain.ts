// Logs nunca carregam o endereço completo (PII): só o domínio.
export function recipientDomain(to: string): string {
  const atIndex = to.indexOf("@");
  return atIndex === -1 ? "(sem @)" : to.slice(atIndex);
}
