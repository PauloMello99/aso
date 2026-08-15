import type { Request } from "express";

const MAX_IP_LENGTH = 64;
const MAX_USER_AGENT_LENGTH = 512;

export interface RequestContext {
  ip: string | null;
  userAgent: string | null;
}

export function extractRequestContext(req: Request): RequestContext {
  // `req.ip` já resolve o IP real do cliente a partir do X-Forwarded-For de
  // forma validada pelo Express quando `trust proxy` está configurado
  // (ver main.ts) — ler o header manualmente aceitaria um valor
  // controlável pelo cliente sem essa validação.
  const rawIp = req.ip?.trim() || req.socket.remoteAddress || null;

  const rawUserAgent = req.headers["user-agent"] ?? null;

  return {
    ip: rawIp ? rawIp.slice(0, MAX_IP_LENGTH) : null,
    userAgent: rawUserAgent
      ? rawUserAgent.slice(0, MAX_USER_AGENT_LENGTH)
      : null,
  };
}
