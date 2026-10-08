const PUBLIC_PREFIX = "public";
// Recursos publicos cujo path e estatico (sem token/slug): preservados.
const STATIC_PUBLIC_RESOURCES: ReadonlySet<string> = new Set([
  "support",
  "billing",
]);
// Recursos em que o token fica no 5o segmento: /public/campaigns/<acao>/<token>.
const ACTION_THEN_TOKEN_RESOURCES: ReadonlySet<string> = new Set(["campaigns"]);

/**
 * Redige o segmento variavel (token/slug) de /public/<recurso>/<segmento>[/...]
 * para uso em logs e telemetria (follow-up do ADR-0035). Remove a query string.
 * Nao altera o "path" devolvido ao proprio cliente. Literais de acao
 * (requests, submit, respond) e rotas estaticas (support, billing/plans) ficam.
 */
export function redactPublicPath(url: string): string {
  const pathOnly = url.split("?")[0] ?? "";
  const segments = pathOnly.split("/");
  // segments[0] === "" para path iniciado em "/".
  if (segments[1] !== PUBLIC_PREFIX) return pathOnly;
  const resource = segments[2];
  if (resource === undefined || STATIC_PUBLIC_RESOURCES.has(resource)) {
    return pathOnly;
  }

  const tokenIndex = ACTION_THEN_TOKEN_RESOURCES.has(resource) ? 4 : 3;
  const token = segments[tokenIndex];
  if (token === undefined || token === "") return pathOnly;
  segments[tokenIndex] = ":param";
  return segments.join("/");
}
