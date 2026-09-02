import { Heading, Img, Link, Text } from "@react-email/components";
import type { ReactNode } from "react";
import { sharedStyles } from "../templates/base-layout";

/**
 * Tipos ESTRUTURAIS do documento rich-text da campanha (T6 Fatia 4). Replicados
 * de propósito — NÃO importados de `campaigns/domain/campaign-body.ts`: o módulo
 * `mail` não pode depender de `campaigns` (dep circular via
 * `CampaignMailerMailServiceAdapter`), mesma razão do union literal
 * `CampaignTriggerName` em `mail.service.ts` (ADR-0025 §1).
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

export interface CampaignBodyValues {
  customerName: string;
  orgName: string;
}

/**
 * Interpola os tokens permitidos em PASSE ÚNICO por regex allowlist — mesma
 * semântica de `interpolate` em `campaigns/domain/campaign-copy.ts`: um valor
 * que já contenha `{{orgName}}` nunca é re-substituído, e um token fora da lista
 * fica literal por não casar o padrão. Nunca `replace` sequencial token a token.
 */
const TOKEN_PATTERN = /\{\{(customerName|orgName)\}\}/g;

function interpolate(text: string, values: CampaignBodyValues): string {
  return text.replace(TOKEN_PATTERN, (_, token: "customerName" | "orgName") =>
    values[token],
  );
}

/**
 * 2ª barreira de segurança do corpo de campanha (a 1ª é `validateCampaignBody`,
 * que roda antes de gravar). Este walker é só SAÍDA: recebe um doc já validado
 * pela allowlist fechada e emite React Email. React escapa texto por construção
 * e este arquivo NUNCA usa `dangerouslySetInnerHTML`. Nó de tipo desconhecido
 * (não deveria chegar) é ignorado silenciosamente — validação não é papel daqui.
 */
export function renderCampaignBody(
  doc: TiptapDoc,
  values: CampaignBodyValues,
): ReactNode {
  return doc.content.map((node, index) =>
    renderNode(node, values, `doc-${index}`),
  );
}

function renderNode(
  node: TiptapNode | TiptapText,
  values: CampaignBodyValues,
  key: string,
): ReactNode {
  if (isTextNode(node)) {
    return renderTextNode(node, values, key);
  }

  switch (node.type) {
    case "paragraph":
      return (
        <Text key={key} style={sharedStyles.paragraph}>
          {renderChildren(node, values)}
        </Text>
      );
    case "heading":
      return renderHeading(node, values, key);
    case "bulletList":
      return (
        <ul key={key} style={listStyle}>
          {renderChildren(node, values)}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key} style={listStyle}>
          {renderChildren(node, values)}
        </ol>
      );
    case "listItem":
      return (
        <li key={key} style={listItemStyle}>
          {renderChildren(node, values)}
        </li>
      );
    case "hardBreak":
      return <br key={key} />;
    case "image":
      return renderImage(node, key);
    default:
      return null;
  }
}

function renderChildren(
  node: TiptapNode,
  values: CampaignBodyValues,
): ReactNode {
  if (!node.content) {
    return null;
  }
  return node.content.map((child, index) =>
    renderNode(child, values, `${node.type}-${index}`),
  );
}

function renderHeading(
  node: TiptapNode,
  values: CampaignBodyValues,
  key: string,
): ReactNode {
  const children = renderChildren(node, values);
  if (node.attrs?.level === 3) {
    return (
      <Heading key={key} as="h3" style={sharedStyles.heading}>
        {children}
      </Heading>
    );
  }
  return (
    <Heading key={key} as="h2" style={sharedStyles.heading}>
      {children}
    </Heading>
  );
}

function renderImage(node: TiptapNode, key: string): ReactNode {
  const attrs = node.attrs ?? {};
  const src = typeof attrs.src === "string" ? safeHttpUrl(attrs.src) : null;
  if (src === null) {
    return null;
  }
  const alt = typeof attrs.alt === "string" ? attrs.alt : "";
  return <Img key={key} src={src} alt={alt} />;
}

/**
 * 2ª barreira independente do walker — o renderer nunca confia em URL de esquema
 * não-http(s), mesmo que `validateCampaignBody` a tenha deixado passar (defesa
 * em profundidade da reversão da D5, ADR-0025 addendum). Devolve a URL
 * normalizada pelo parser WHATWG ou `null` quando o esquema não é http(s) / o
 * valor não parseia.
 */
function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function renderTextNode(
  node: TiptapText,
  values: CampaignBodyValues,
  key: string,
): ReactNode {
  const value = interpolate(node.text, values);
  const marks = node.marks ?? [];
  if (marks.length === 0) {
    return value;
  }
  return marks.reduce<ReactNode>(
    (child, mark) => wrapMark(mark, child, key),
    value,
  );
}

function wrapMark(mark: TiptapMark, child: ReactNode, key: string): ReactNode {
  switch (mark.type) {
    case "bold":
      return <strong key={key}>{child}</strong>;
    case "italic":
      return <em key={key}>{child}</em>;
    case "link": {
      const href = safeHttpUrl(mark.attrs.href);
      if (href === null) {
        return child;
      }
      return (
        <Link
          key={key}
          href={href}
          target={mark.attrs.target}
          rel={mark.attrs.rel}
          style={sharedStyles.linkInline}
        >
          {child}
        </Link>
      );
    }
  }
}

function isTextNode(node: TiptapNode | TiptapText): node is TiptapText {
  return node.type === "text";
}

const listStyle: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#3f3f46",
  margin: "0 0 16px",
  paddingLeft: "24px",
};

const listItemStyle: React.CSSProperties = {
  margin: "0 0 4px",
};
