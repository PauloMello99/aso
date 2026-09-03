import { CampaignInvalidBodyException } from "./exceptions/campaign-invalid-body.exception";

/**
 * Tipos ESTRUTURAIS do documento rich-text da campanha. O backend não instala
 * `@tiptap/*`: estes tipos descrevem só o formato serializado (JSON) que
 * `campaigns.body` guarda. A Fatia 2 deixou um TODO para apertar a coluna para
 * `.$type<TiptapDoc | null>()` — ver `deviations_from_plan` do handoff.
 */
export type TiptapMark =
  | { type: "bold" }
  | { type: "italic" }
  | { type: "link"; attrs: { href: string; target: string; rel: string } };

export interface TiptapText {
  type: "text";
  text: string;
  marks?: TiptapMark[];
}

export interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: (TiptapNode | TiptapText)[];
  text?: string;
  marks?: TiptapMark[];
}

export interface TiptapDoc {
  type: "doc";
  content: (TiptapNode | TiptapText)[];
}

/**
 * Profundidade máxima de aninhamento: `doc` é o nível 0, cada `content` aninhado
 * soma 1, e qualquer nó (incluindo folhas como `text`) além do nível 5 lança. O
 * objetivo é limitar a recursão sobre JSON malicioso, não modelar semântica de
 * editor.
 */
const MAX_DEPTH = 5;

/** Máximo de nós `image` no documento inteiro (D-D). */
const MAX_IMAGES = 10;

/**
 * Teto de bytes do documento serializado, casando com o CHECK
 * `campaigns_body_size_check` do banco (`octet_length(body::text) <= 65536`).
 * Medimos `JSON.stringify` do doc re-emitido em UTF-8: para um objeto só com
 * string/number/array/objeto plano (sem chaves duplicadas, sem espaços) o
 * tamanho casa com o `jsonb::text` do Postgres para efeito de teto — e erra
 * para o lado conservador (rejeita um pouco antes) quando difere.
 */
const MAX_BODY_BYTES = 65536;

/** `target`/`rel` de `link` são NORMALIZADOS — nunca aceitos do cliente. */
const LINK_TARGET = "_blank";
const LINK_REL = "noopener noreferrer nofollow";

interface WalkContext {
  images: number;
  /**
   * Quando definido, todo `image.src` (após `normalizeUrl`) DEVE começar com
   * este prefixo — a URL pública do bucket `campaign-images`. `undefined`
   * mantém só a regra http(s), preservando o comportamento legado e a pureza da
   * função (testável sem config).
   */
  imageSrcPrefix?: string;
}

/**
 * Valida um documento Tiptap/ProseMirror contra uma allowlist FECHADA e devolve
 * uma cópia re-emitida contendo APENAS os campos validados (o caller grava este
 * retorno, não o input cru). Pura, síncrona, sem I/O. Qualquer nó, marca ou
 * atributo fora da allowlist lança `CampaignInvalidBodyException` (→ 400).
 *
 * `opts.imageSrcPrefix` (opcional) aperta `image.src` para exigir que a imagem
 * tenha sido enviada pelo `UploadCampaignImageUseCase` (prefixo do bucket
 * `campaign-images`); ausente, `image.src` só precisa ser http(s).
 */
export function validateCampaignBody(
  input: unknown,
  opts?: { imageSrcPrefix?: string },
): TiptapDoc {
  if (!isPlainObject(input)) {
    throw new CampaignInvalidBodyException("body must be an object");
  }
  if (input.type !== "doc") {
    throw new CampaignInvalidBodyException("root node must be a doc");
  }
  if (!Array.isArray(input.content)) {
    throw new CampaignInvalidBodyException("doc content must be an array");
  }

  const context: WalkContext = {
    images: 0,
    imageSrcPrefix: opts?.imageSrcPrefix,
  };
  const content = input.content.map((child) => validateNode(child, 1, context));

  const result: TiptapDoc = { type: "doc", content };
  if (Buffer.byteLength(JSON.stringify(result), "utf8") > MAX_BODY_BYTES) {
    throw new CampaignInvalidBodyException("body exceeds maximum size");
  }
  return result;
}

function validateNode(
  node: unknown,
  depth: number,
  context: WalkContext,
): TiptapNode | TiptapText {
  if (depth > MAX_DEPTH) {
    throw new CampaignInvalidBodyException("maximum nesting depth exceeded");
  }
  if (!isPlainObject(node)) {
    throw new CampaignInvalidBodyException("each node must be an object");
  }

  const type = node.type;
  if (type === "text") {
    return validateTextNode(node);
  }
  if (type === "hardBreak") {
    return validateHardBreakNode(node);
  }
  if (type === "heading") {
    return validateHeadingNode(node, depth, context);
  }
  if (type === "image") {
    return validateImageNode(node, context);
  }
  if (
    type === "paragraph" ||
    type === "bulletList" ||
    type === "orderedList" ||
    type === "listItem"
  ) {
    return validateContainerNode(node, type, depth, context);
  }

  throw new CampaignInvalidBodyException("unsupported node type");
}

function validateTextNode(node: Record<string, unknown>): TiptapText {
  if (typeof node.text !== "string") {
    throw new CampaignInvalidBodyException("text node requires a string text");
  }
  if (hasLoneSurrogate(node.text)) {
    throw new CampaignInvalidBodyException("text contains invalid characters");
  }
  rejectAttrs(node);
  rejectContent(node);

  const result: TiptapText = { type: "text", text: node.text };
  const marks = validateMarks(node.marks);
  if (marks) {
    result.marks = marks;
  }
  return result;
}

function validateHardBreakNode(node: Record<string, unknown>): TiptapNode {
  rejectAttrs(node);
  rejectContent(node);
  rejectMarks(node);
  rejectText(node);
  return { type: "hardBreak" };
}

function validateHeadingNode(
  node: Record<string, unknown>,
  depth: number,
  context: WalkContext,
): TiptapNode {
  rejectMarks(node);
  rejectText(node);

  if (!isPlainObject(node.attrs)) {
    throw new CampaignInvalidBodyException("heading requires a level attribute");
  }
  const keys = Object.keys(node.attrs);
  if (keys.length !== 1 || keys[0] !== "level") {
    throw new CampaignInvalidBodyException(
      "heading only accepts a level attribute",
    );
  }
  const level = node.attrs.level;
  if (level !== 2 && level !== 3) {
    throw new CampaignInvalidBodyException("unsupported heading level");
  }

  const result: TiptapNode = { type: "heading", attrs: { level } };
  const content = validateChildContent(node, depth, context);
  if (content) {
    result.content = content;
  }
  return result;
}

function validateImageNode(
  node: Record<string, unknown>,
  context: WalkContext,
): TiptapNode {
  rejectContent(node);
  rejectMarks(node);
  rejectText(node);

  if (!isPlainObject(node.attrs)) {
    throw new CampaignInvalidBodyException("image requires a src attribute");
  }
  for (const key of Object.keys(node.attrs)) {
    if (key !== "src" && key !== "alt") {
      throw new CampaignInvalidBodyException(
        "image only accepts src and alt attributes",
      );
    }
  }
  const src = node.attrs.src;
  if (typeof src !== "string") {
    throw new CampaignInvalidBodyException("image src must be a string");
  }
  // `normalizeUrl` já resolveu dot-segments no parse, então este `startsWith`
  // não é enganável por `.../campaign-images/../../etc/x.png` (vira
  // `.../object/etc/x.png` e não casa o prefixo).
  const normalizedSrc = normalizeUrl(src);
  if (
    context.imageSrcPrefix !== undefined &&
    !normalizedSrc.startsWith(context.imageSrcPrefix)
  ) {
    throw new CampaignInvalidBodyException(
      "image src must be an uploaded campaign image",
    );
  }
  const attrs: { src: string; alt?: string } = { src: normalizedSrc };
  if ("alt" in node.attrs) {
    if (typeof node.attrs.alt !== "string") {
      throw new CampaignInvalidBodyException("image alt must be a string");
    }
    if (hasLoneSurrogate(node.attrs.alt)) {
      throw new CampaignInvalidBodyException(
        "image alt contains invalid characters",
      );
    }
    attrs.alt = node.attrs.alt;
  }

  context.images += 1;
  if (context.images > MAX_IMAGES) {
    throw new CampaignInvalidBodyException("too many image nodes");
  }

  return { type: "image", attrs };
}

function validateContainerNode(
  node: Record<string, unknown>,
  type: "paragraph" | "bulletList" | "orderedList" | "listItem",
  depth: number,
  context: WalkContext,
): TiptapNode {
  rejectAttrs(node);
  rejectMarks(node);
  rejectText(node);

  const result: TiptapNode = { type };
  const content = validateChildContent(node, depth, context);
  if (content) {
    result.content = content;
  }
  return result;
}

/**
 * `content` ausente é legal (o Tiptap emite `{ type: "paragraph" }` para um
 * parágrafo vazio). Quando presente, precisa ser array e cada filho desce um
 * nível na recursão.
 */
function validateChildContent(
  node: Record<string, unknown>,
  depth: number,
  context: WalkContext,
): (TiptapNode | TiptapText)[] | undefined {
  if (!("content" in node) || node.content === undefined) {
    return undefined;
  }
  if (!Array.isArray(node.content)) {
    throw new CampaignInvalidBodyException("node content must be an array");
  }
  return node.content.map((child) => validateNode(child, depth + 1, context));
}

function validateMarks(input: unknown): TiptapMark[] | undefined {
  if (input === undefined) {
    return undefined;
  }
  if (!Array.isArray(input)) {
    throw new CampaignInvalidBodyException("marks must be an array");
  }
  if (input.length === 0) {
    return undefined;
  }
  return input.map((mark) => validateMark(mark));
}

function validateMark(mark: unknown): TiptapMark {
  if (!isPlainObject(mark)) {
    throw new CampaignInvalidBodyException("each mark must be an object");
  }
  if (mark.type === "bold" || mark.type === "italic") {
    rejectAttrs(mark);
    return { type: mark.type };
  }
  if (mark.type === "link") {
    return validateLinkMark(mark);
  }
  throw new CampaignInvalidBodyException("unsupported mark type");
}

/**
 * `link`: aceita SÓ `href` do cliente; `target`/`rel` são re-emitidos com os
 * valores normalizados (qualquer coisa que veio no input é descartada).
 */
function validateLinkMark(mark: Record<string, unknown>): TiptapMark {
  if (!isPlainObject(mark.attrs)) {
    throw new CampaignInvalidBodyException("link mark requires an href");
  }
  const href = mark.attrs.href;
  if (typeof href !== "string") {
    throw new CampaignInvalidBodyException("link href must be a string");
  }
  return {
    type: "link",
    attrs: {
      href: normalizeUrl(href),
      target: LINK_TARGET,
      rel: LINK_REL,
    },
  };
}

/**
 * Aceita SÓ `http:` ou `https:` e devolve a URL NORMALIZADA pelo parser WHATWG
 * (`new URL`) — é esse valor re-emitido que o caller grava. O parse resolve
 * dot-segments (`..`/`.`, inclusive `%2e%2e`), percent-encoda caracteres
 * ilegais/de controle e remove tab/CR/LF, então o `startsWith` de
 * `imageSrcPrefix` fica confiável contra path traversal. Rejeita (→ 400)
 * `javascript:`, `data:`, `vbscript:`, protocolo-relativo (`//host`) e caminho
 * relativo/absoluto sem esquema — todos ou lançam no `new URL` (sem base) ou
 * caem no filtro de protocolo.
 */
function normalizeUrl(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new CampaignInvalidBodyException("unsupported url scheme");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new CampaignInvalidBodyException("unsupported url scheme");
  }
  return parsed.toString();
}

/**
 * Um surrogate UTF-16 solto (high sem low, ou low sem high) é string válida em
 * JS mas o `JSON.stringify` do doc re-emitido carrega o escape `\uXXXX` cru, e o
 * parser jsonb do Postgres rejeita o INSERT → 500. Barramos no walker (→ 400).
 * `normalizeUrl` já cobre `src`/`href` (o `new URL().toString()` percent-encoda
 * o surrogate); resta `text.text` e `image.attrs.alt`, os outros campos
 * re-emitidos são constantes/número.
 */
function hasLoneSurrogate(value: string): boolean {
  return /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(
    value,
  );
}

function rejectAttrs(node: Record<string, unknown>): void {
  if (!("attrs" in node) || node.attrs === undefined || node.attrs === null) {
    return;
  }
  if (!isPlainObject(node.attrs) || Object.keys(node.attrs).length > 0) {
    throw new CampaignInvalidBodyException("node does not accept attributes");
  }
}

function rejectContent(node: Record<string, unknown>): void {
  if ("content" in node && node.content !== undefined) {
    throw new CampaignInvalidBodyException("node does not accept content");
  }
}

function rejectMarks(node: Record<string, unknown>): void {
  if ("marks" in node && node.marks !== undefined) {
    throw new CampaignInvalidBodyException(
      "marks are only allowed on text nodes",
    );
  }
}

function rejectText(node: Record<string, unknown>): void {
  if ("text" in node && node.text !== undefined) {
    throw new CampaignInvalidBodyException("only text nodes carry a text field");
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
