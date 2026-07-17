import type { Request } from "express";

const MAX_IP_LENGTH = 64;
const MAX_USER_AGENT_LENGTH = 512;

export interface RequestContext {
  ip: string | null;
  userAgent: string | null;
}

/**
 * Extrai IP e User-Agent da requisição pra fins de proveniência (evidência
 * de assinatura eletrônica). Truncado defensivamente — nunca confiar
 * cegamente em headers vindos do cliente.
 */
export function extractRequestContext(req: Request): RequestContext {
  const forwardedFor = req.headers["x-forwarded-for"];
  const forwardedIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(",")[0];
  const rawIp = forwardedIp?.trim() || req.socket.remoteAddress || null;

  const rawUserAgent = req.headers["user-agent"] ?? null;

  return {
    ip: rawIp ? rawIp.slice(0, MAX_IP_LENGTH) : null,
    userAgent: rawUserAgent
      ? rawUserAgent.slice(0, MAX_USER_AGENT_LENGTH)
      : null,
  };
}
