import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseLayout, sharedStyles } from "./base-layout";

export interface InviteEmailProps {
  orgName: string;
  acceptUrl: string;
}

export function InviteEmail({ orgName, acceptUrl }: InviteEmailProps) {
  return (
    <BaseLayout preview={`Convite para ${orgName} no Ink Ops`}>
      <Heading style={sharedStyles.heading}>Você foi convidado 🎉</Heading>
      <Text style={sharedStyles.paragraph}>
        Você foi convidado para participar de <strong>{orgName}</strong> no Ink
        Ops. Clique no botão abaixo para aceitar o convite e acessar o estúdio.
      </Text>
      <Section style={{ textAlign: "center", margin: "24px 0" }}>
        <Button href={acceptUrl} style={sharedStyles.button}>
          Aceitar convite
        </Button>
      </Section>
      <Text style={sharedStyles.muted}>
        Ou copie e cole este link no navegador:
        <br />
        <span style={sharedStyles.link}>{acceptUrl}</span>
      </Text>
      <Text style={sharedStyles.muted}>O convite expira em 7 dias.</Text>
    </BaseLayout>
  );
}

// Default export para a preview do `react-email` (email dev).
export default function InviteEmailPreview() {
  return (
    <InviteEmail
      orgName="Helena's Ink"
      acceptUrl="https://app.inkops.app/invite/accept?token=preview-token"
    />
  );
}
