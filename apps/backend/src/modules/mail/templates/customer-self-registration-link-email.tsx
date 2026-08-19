import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseLayout, sharedStyles } from "./base-layout";

export interface CustomerSelfRegistrationLinkEmailProps {
  orgName: string;
  fillUrl: string;
  supportEmail?: string;
}

export function CustomerSelfRegistrationLinkEmail({
  orgName,
  fillUrl,
  supportEmail,
}: CustomerSelfRegistrationLinkEmailProps) {
  return (
    <BaseLayout
      preview="Complete seu cadastro e sua ficha de anamnese"
      supportEmail={supportEmail}
    >
      <Heading style={sharedStyles.heading}>Complete seu cadastro</Heading>
      <Text style={sharedStyles.paragraph}>
        Você foi convidado por <strong>{orgName}</strong> para completar seu
        cadastro e preencher sua ficha de anamnese antes do atendimento.
        Clique no botão abaixo para começar.
      </Text>
      <Section style={{ textAlign: "center", margin: "24px 0" }}>
        <Button href={fillUrl} style={sharedStyles.button}>
          Completar cadastro
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

export default function CustomerSelfRegistrationLinkEmailPreview() {
  return (
    <CustomerSelfRegistrationLinkEmail
      orgName="Helena's Ink"
      fillUrl="https://assessorink-so.com/customer-self-service/preview-token"
    />
  );
}
