import { Button, Heading, Section, Text } from "@react-email/components";
import type { TicketSlaAlertType } from "../../support/domain/ticket-sla";
import { BaseLayout, sharedStyles } from "./base-layout";

export type { TicketSlaAlertType };

const ALERT_LABELS: Record<TicketSlaAlertType, string> = {
  first_response_near: "SLA de primeira resposta perto de vencer",
  first_response_breached: "SLA de primeira resposta vencido",
  resolution_near: "SLA de resolução perto de vencer",
  resolution_breached: "SLA de resolução vencido",
};

export interface TicketSlaAlertEmailProps {
  ticketId: string;
  ticketSubject: string;
  orgName: string;
  alertType: TicketSlaAlertType;
  queueUrl?: string;
  supportEmail?: string;
}

export function TicketSlaAlertEmail({
  ticketId,
  ticketSubject,
  orgName,
  alertType,
  queueUrl,
  supportEmail,
}: TicketSlaAlertEmailProps) {
  const label = ALERT_LABELS[alertType];
  return (
    <BaseLayout
      preview={`${label}: ${ticketSubject}`}
      supportEmail={supportEmail}
    >
      <Heading style={sharedStyles.heading}>{label}</Heading>
      <Text style={sharedStyles.paragraph}>
        O chamado <strong>&ldquo;{ticketSubject}&rdquo;</strong> da
        organização <strong>{orgName}</strong> precisa de atenção.
      </Text>
      <Text style={sharedStyles.muted}>Protocolo: {ticketId}</Text>
      {queueUrl ? (
        <Section style={{ textAlign: "center", margin: "24px 0" }}>
          <Button href={queueUrl} style={sharedStyles.button}>
            Ver fila de atendimento
          </Button>
        </Section>
      ) : null}
    </BaseLayout>
  );
}

export default function TicketSlaAlertEmailPreview() {
  return (
    <TicketSlaAlertEmail
      ticketId="a1b2c3d4-e5f6-7890-abcd-ef1234567890"
      ticketSubject="Problema ao registrar pagamento"
      orgName="Helena's Ink"
      alertType="first_response_breached"
      queueUrl="https://assessorink-so.com/admin/support"
    />
  );
}
