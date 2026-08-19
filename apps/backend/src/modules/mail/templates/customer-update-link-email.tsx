import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseLayout, sharedStyles } from "./base-layout";

export interface CustomerUpdateLinkEmailProps {
  orgName: string;
  customerName: string;
  fillUrl: string;
  supportEmail?: string;
}

export function CustomerUpdateLinkEmail({
  orgName,
  customerName,
  fillUrl,
  supportEmail,
}: CustomerUpdateLinkEmailProps) {
  return (
    <BaseLayout
      preview="Atualize seus dados cadastrais"
      supportEmail={supportEmail}
    >
      <Heading style={sharedStyles.heading}>Olá, {customerName}!</Heading>
      <Text style={sharedStyles.paragraph}>
        <strong>{orgName}</strong> pediu que você confira e atualize seus
        dados cadastrais. Clique no botão abaixo para revisar suas
        informações.
      </Text>
      <Section style={{ textAlign: "center", margin: "24px 0" }}>
        <Button href={fillUrl} style={sharedStyles.button}>
          Atualizar dados
        </Button>
      </Section>
      <Text style={sharedStyles.muted}>
        Ou copie e cole este link no navegador:
        <br />
        <span style={sharedStyles.link}>{fillUrl}</span>
      </Text>
      <Text style={sharedStyles.muted}>Este link expira em 7 dias.</Text>
    </BaseLayout>
  );
}

export default function CustomerUpdateLinkEmailPreview() {
  return (
    <CustomerUpdateLinkEmail
      orgName="Helena's Ink"
      customerName="Maria"
      fillUrl="https://assessorink-so.com/customer-self-service/preview-token"
    />
  );
}
