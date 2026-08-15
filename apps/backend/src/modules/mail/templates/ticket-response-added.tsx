import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseLayout, sharedStyles } from "./base-layout";

const PREVIEW_MAX_LENGTH = 240;

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}

export interface TicketResponseAddedEmailProps {
  requesterName: string;
  ticketSubject: string;
  responseBody: string;
  portalUrl: string;
  supportEmail?: string;
}

export function TicketResponseAddedEmail({
  requesterName,
  ticketSubject,
  responseBody,
  portalUrl,
  supportEmail,
}: TicketResponseAddedEmailProps) {
  return (
    <BaseLayout
      preview={`Nova resposta no seu chamado: ${ticketSubject}`}
      supportEmail={supportEmail}
    >
      <Heading style={sharedStyles.heading}>Nova resposta no chamado</Heading>
      <Text style={sharedStyles.paragraph}>
        Olá, {requesterName}. Você recebeu uma nova resposta no chamado{" "}
        <strong>&ldquo;{ticketSubject}&rdquo;</strong>:
      </Text>
      <Section
        style={{
          backgroundColor: "#f4f4f5",
          borderRadius: "8px",
          padding: "16px",
          margin: "0 0 16px",
        }}
      >
        <Text style={{ ...sharedStyles.paragraph, margin: 0 }}>
          {truncate(responseBody, PREVIEW_MAX_LENGTH)}
        </Text>
      </Section>
      <Section style={{ textAlign: "center", margin: "24px 0" }}>
        <Button href={portalUrl} style={sharedStyles.button}>
          Ver resposta completa
        </Button>
      </Section>
    </BaseLayout>
  );
}

export default function TicketResponseAddedEmailPreview() {
  return (
    <TicketResponseAddedEmail
      requesterName="Cliente Teste"
      ticketSubject="Problema ao registrar pagamento"
      responseBody="Olá! Verificamos o problema e já aplicamos a correção. Pode conferir e nos avisar se persistir?"
      portalUrl="https://assessorink-so.com/dashboard/org/helenas-ink/support"
    />
  );
}
