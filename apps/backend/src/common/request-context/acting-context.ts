import { AsyncLocalStorage } from "node:async_hooks";
import type { Request } from "express";

// Fora de um `runWithActingContext` ativo (cron, bootstrap, admin-panel direto
// fora de contexto de org, ou teste chamando um repo direto), `isActingAsSuperAdmin()`
// retorna `false` por design: essas acoes nao sao "sintese de super_admin em org"
// (ADR-0013), entao o default seguro e false.

type ActingContextStore = {
  actingAsSuperAdmin: boolean;
};

const alsStorage = new AsyncLocalStorage<ActingContextStore>();

export async function runWithActingContext<T>(
  seed: boolean,
  fn: () => Promise<T>,
): Promise<T> {
  const result = await alsStorage.run({ actingAsSuperAdmin: seed }, fn);
  return result;
}

export function markActingAsSuperAdmin(): void {
  const store = alsStorage.getStore();
  if (!store) return;
  store.actingAsSuperAdmin = true;
}

export function isActingAsSuperAdmin(): boolean {
  return alsStorage.getStore()?.actingAsSuperAdmin ?? false;
}

// Guards escrevem essa propriedade no `request` porque guards rodam ANTES de
// interceptors no ciclo de vida do Nest (Middleware -> Guards -> Interceptors
// -> Controller), entao nao conseguem entrar direto no AsyncLocalStorage. Quem
// le essa propriedade e entra no ALS (via runWithActingContext) e o
// RlsInterceptor, num passo futuro.
export type RequestWithActingContext = Request & {
  actingAsSuperAdmin?: boolean;
};
