export const TRANSACTION_RUNNER = Symbol("TRANSACTION_RUNNER");

/**
 * Marcador opaco para uma transação de banco em andamento. A camada de
 * domínio não conhece Drizzle/Postgres — este token só é repassado entre
 * `ITransactionRunner.run` e os parâmetros `tx?`/`tx` dos métodos
 * `*AsAdmin(...)` dos repositórios do módulo, que fazem o cast pra sua
 * conexão real (DrizzleDB) na camada de infraestrutura.
 */
export type TransactionContext = { readonly __brand: "TransactionContext" };

export interface ITransactionRunner {
  /**
   * Executa `fn` dentro de uma única transação DRIZZLE_ADMIN. Se `fn`
   * lançar, a transação inteira sofre ROLLBACK — nenhum efeito colateral
   * fora da transação (ex.: notificação por e-mail) deve rodar dentro de
   * `fn`; dispare-o depois que `run` resolver.
   */
  run<T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T>;
}
