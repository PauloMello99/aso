import { createHash, randomBytes } from "crypto";

const WELL_FORMED_TOKEN = /^[A-Za-z0-9_-]{43}$/;

// 32 bytes aleatórios em base64url (43 caracteres). O token em claro só existe
// no link enviado ao cliente; no banco vai apenas o hash.
export function generateConfirmationToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashConfirmationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isWellFormedConfirmationToken(token: string): boolean {
  return WELL_FORMED_TOKEN.test(token);
}
