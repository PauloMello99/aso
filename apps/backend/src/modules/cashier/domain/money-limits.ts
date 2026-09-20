/**
 * Teto de valores monetarios (em centavos) aceitos na API: maximo de um `integer`
 * (int32) do Postgres. Acima disso o INSERT estoura com 500; o DTO rejeita com 400.
 */
export const MAX_AMOUNT_CENTS = 2147483647;
