import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

interface BaseLayoutProps {
  /** Texto curto exibido na prévia da caixa de entrada. */
  preview: string;
  children: ReactNode;
}

/**
 * Layout/branding compartilhado por todos os e-mails transacionais do Ink Ops.
 * Mantém header, footer, tipografia e cores num só lugar.
 */
export function BaseLayout({ preview, children }: BaseLayoutProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>Ink Ops</Text>
          </Section>
          <Section style={card}>{children}</Section>
          <Hr style={hr} />
          <Section>
            <Text style={footer}>
              Você recebeu este e-mail porque possui uma conta no Ink Ops.
              <br />
              Precisa de ajuda? Fale com a gente em{" "}
              <Link href="mailto:suporte@inkops.app" style={footerLink}>
                suporte@inkops.app
              </Link>
              .
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  margin: 0,
  padding: "24px 0",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

const container: React.CSSProperties = {
  maxWidth: "520px",
  margin: "0 auto",
  padding: "0 16px",
};

const header: React.CSSProperties = {
  padding: "8px 0 16px",
  textAlign: "center",
};

const brand: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 700,
  color: "#18181b",
  letterSpacing: "-0.5px",
  margin: 0,
};

const card: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  padding: "32px",
  border: "1px solid #e4e4e7",
};

const hr: React.CSSProperties = {
  borderColor: "#e4e4e7",
  margin: "24px 0",
};

const footer: React.CSSProperties = {
  fontSize: "12px",
  lineHeight: "18px",
  color: "#71717a",
  textAlign: "center",
  margin: 0,
};

const footerLink: React.CSSProperties = {
  color: "#71717a",
  textDecoration: "underline",
};

/** Estilos reutilizados pelos templates concretos. */
export const sharedStyles = {
  heading: {
    fontSize: "20px",
    fontWeight: 600,
    color: "#18181b",
    margin: "0 0 16px",
  } satisfies React.CSSProperties,
  paragraph: {
    fontSize: "15px",
    lineHeight: "24px",
    color: "#3f3f46",
    margin: "0 0 16px",
  } satisfies React.CSSProperties,
  button: {
    backgroundColor: "#18181b",
    borderRadius: "8px",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: 600,
    textDecoration: "none",
    textAlign: "center",
    display: "inline-block",
    padding: "12px 24px",
  } satisfies React.CSSProperties,
  link: {
    color: "#2563eb",
    fontSize: "13px",
    wordBreak: "break-all",
  } satisfies React.CSSProperties,
  muted: {
    fontSize: "13px",
    lineHeight: "20px",
    color: "#71717a",
    margin: "16px 0 0",
  } satisfies React.CSSProperties,
};
