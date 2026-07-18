import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseLayout, sharedStyles } from "./base-layout";

export interface AnamnesisLinkEmailProps {
  customerName: string;
  fillUrl: string;
}

export function AnamnesisLinkEmail({
  customerName,
  fillUrl,
}: AnamnesisLinkEmailProps) {
  return (
    <BaseLayout preview="Preencha sua ficha de anamnese antes do atendimento">
      <Heading style={sharedStyles.heading}>Olá, {customerName}!</Heading>
      <Text style={sharedStyles.paragraph}>
        Antes do seu atendimento, precisamos que você preencha a ficha de
        anamnese. Clique no botão abaixo para responder o formulário.
      </Text>
      <Section style={{ textAlign: "center", margin: "24px 0" }}>
        <Button href={fillUrl} style={sharedStyles.button}>
          Preencher ficha
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

export default function AnamnesisLinkEmailPreview() {
  return (
    <AnamnesisLinkEmail
      customerName="Maria"
      fillUrl="https://app.inkops.app/anamnesis/preview-token"
    />
  );
}
