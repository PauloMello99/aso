import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseLayout, sharedStyles } from "./base-layout";

export interface AnamnesisSignedCopyEmailProps {
  customerName: string;
  pdfUrl: string;
}

export function AnamnesisSignedCopyEmail({
  customerName,
  pdfUrl,
}: AnamnesisSignedCopyEmailProps) {
  return (
    <BaseLayout preview="Recebemos sua ficha de anamnese assinada">
      <Heading style={sharedStyles.heading}>Olá, {customerName}!</Heading>
      <Text style={sharedStyles.paragraph}>
        Recebemos sua ficha de anamnese assinada. Clique no botão abaixo para
        baixar uma cópia em PDF para os seus registros.
      </Text>
      <Section style={{ textAlign: "center", margin: "24px 0" }}>
        <Button href={pdfUrl} style={sharedStyles.button}>
          Baixar cópia
        </Button>
      </Section>
      <Text style={sharedStyles.muted}>
        Ou copie e cole este link no navegador:
        <br />
        <span style={sharedStyles.link}>{pdfUrl}</span>
      </Text>
      <Text style={sharedStyles.muted}>Este link expira em 7 dias.</Text>
    </BaseLayout>
  );
}

// Default export para a preview do `react-email` (email dev).
export default function AnamnesisSignedCopyEmailPreview() {
  return (
    <AnamnesisSignedCopyEmail
      customerName="Maria"
      pdfUrl="https://app.inkops.app/storage/anamnesis-documents/preview.pdf"
    />
  );
}
