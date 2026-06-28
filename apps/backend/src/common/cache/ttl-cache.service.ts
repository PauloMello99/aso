import { Injectable } from "@nestjs/common";

type Entry = { value: unknown; expiresAt: number };

/**
 * Cache em memória, por instância, com TTL. Suficiente para dados pequenos e
 * raramente alterados (taxas, categorias) numa única réplica. Sem dependências
 * externas.
 *
 * NÃO é compartilhado entre instâncias: ao escalar para múltiplas réplicas,
 * trocar por Redis (ver ADR-0011). Chaves devem ser escopadas por org
 * (`fees:<orgId>`) — o conteúdo cacheado é sempre dado org-wide, então não há
 * vazamento entre tenants.
 */
@Injectable()
export class TtlCache {
  private readonly store = new Map<string, Entry>();

  /** Retorna o valor cacheado (se não expirado) ou executa `factory` e cacheia. */
  async wrap<T>(
    key: string,
    ttlMs: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    const hit = this.store.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.value as T;
    const value = await factory();
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  }

  /** Invalida uma chave (chamar nos caminhos de escrita). */
  del(key: string): void {
    this.store.delete(key);
  }
}
