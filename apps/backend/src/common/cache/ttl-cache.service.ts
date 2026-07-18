import { Injectable } from "@nestjs/common";

type Entry = { value: unknown; expiresAt: number };

@Injectable()
export class TtlCache {
  private readonly store = new Map<string, Entry>();

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

  del(key: string): void {
    this.store.delete(key);
  }
}
