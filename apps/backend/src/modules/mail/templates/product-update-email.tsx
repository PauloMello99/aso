import {
  Button,
  Heading,
  Link,
  Section,
  Text,
} from "@react-email/components";
import { BaseLayout, sharedStyles } from "./base-layout";

export interface ProductUpdateEmailProps {
  name: string;
  semver: string;
  title: string;
  summary: string;
  highlights?: readonly string[];
  appUrl?: string;
  accountUrl?: string;
  supportEmail?: string;
}

export function ProductUpdateEmail({
  name,
  semver,
  title,
  summary,
  highlights,
  appUrl,
  accountUrl,
  supportEmail,
}: ProductUpdateEmailProps) {
  const items = highlights ?? [];
  return (
    <BaseLayout
      preview={`Novidades do ASO ${semver}: ${title}`}
      supportEmail={supportEmail}
      footerOverride={
        <Text style={footer}>
          Você recebe este e-mail por ser dono de uma organização no ASO.
          <br />
          Para deixar de receber e-mails de novidades, desative a opção em{" "}
          {accountUrl ? (
            <Link href={accountUrl} style={footerLink}>
              Minha Conta
            </Link>
          ) : (
            "Minha Conta"
          )}
          .
        </Text>
      }
    >
      <Heading style={sharedStyles.heading}>Novidades do ASO {semver}</Heading>
      <Text style={sharedStyles.paragraph}>Olá, {name}.</Text>
      <Text style={{ ...sharedStyles.paragraph, fontWeight: 600 }}>
        {title}
      </Text>
      <Text style={sharedStyles.paragraph}>{summary}</Text>
      {items.length > 0 ? (
        <ul style={list}>
          {items.map((item, index) => (
            <li key={index} style={listItem}>
              {item}
            </li>
          ))}
        </ul>
      ) : null}
      {appUrl ? (
        <Section style={{ textAlign: "center", margin: "24px 0" }}>
          <Button href={appUrl} style={sharedStyles.button}>
            Abrir o ASO
          </Button>
        </Section>
      ) : null}
    </BaseLayout>
  );
}

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

const list: React.CSSProperties = {
  margin: "0 0 16px",
  paddingLeft: "20px",
};

const listItem: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#3f3f46",
  margin: "0 0 6px",
};

export default function ProductUpdateEmailPreview() {
  return (
    <ProductUpdateEmail
      name="Paulo"
      semver="1.4.0"
      title="Changelog e avisos de novidades"
      summary="Agora você acompanha o que mudou no ASO direto pelo app e por e-mail."
      highlights={["Banner de novidades no app", "Aviso por e-mail"]}
      appUrl="https://assessorink-so.com"
      accountUrl="https://assessorink-so.com/dashboard/account"
    />
  );
}
