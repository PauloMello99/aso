import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseLayout, sharedStyles } from "./base-layout";

export interface TicketStatusChangedEmailProps {
  requesterName: string;
  ticketSubject: string;
  newStatus: string;
  portalUrl?: string;
  supportEmail?: string;
}

export function TicketStatusChangedEmail({
  requesterName,
  ticketSubject,
  newStatus,
  portalUrl,
  supportEmail,
}: TicketStatusChangedEmailProps) {
  return (
    <BaseLayout
      preview={`Seu chamado agora está: ${newStatus}`}
      supportEmail={supportEmail}
    >
      <Heading style={sharedStyles.heading}>Atualização do chamado</Heading>
      <Text style={sharedStyles.paragraph}>
        Olá, {requesterName}. O chamado{" "}
        <strong>&ldquo;{ticketSubject}&rdquo;</strong> agora está com status{" "}
        <strong>{newStatus}</strong>.
      </Text>
      {portalUrl ? (
        <Section style={{ textAlign: "center", margin: "24px 0" }}>
          <Button href={portalUrl} style={sharedStyles.button}>
            Ver chamado
          </Button>
        </Section>
      ) : null}
    </BaseLayout>
  );
}

export default function TicketStatusChangedEmailPreview() {
  return (
    <TicketStatusChangedEmail
      requesterName="Cliente Teste"
      ticketSubject="Problema ao registrar pagamento"
      newStatus="Resolvido"
      portalUrl="https://assessorink-so.com/dashboard/org/helenas-ink/support"
    />
  );
}
