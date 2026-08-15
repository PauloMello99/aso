import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseLayout, sharedStyles } from "./base-layout";

export interface TicketCreatedEmailProps {
  requesterName: string;
  ticketSubject: string;
  ticketId: string;
  portalUrl?: string;
  supportEmail?: string;
}

export function TicketCreatedEmail({
  requesterName,
  ticketSubject,
  ticketId,
  portalUrl,
  supportEmail,
}: TicketCreatedEmailProps) {
  return (
    <BaseLayout
      preview={`Recebemos seu chamado: ${ticketSubject}`}
      supportEmail={supportEmail}
    >
      <Heading style={sharedStyles.heading}>Chamado recebido</Heading>
      <Text style={sharedStyles.paragraph}>
        Olá, {requesterName}. Recebemos seu chamado{" "}
        <strong>&ldquo;{ticketSubject}&rdquo;</strong> e nossa equipe já vai
        analisar.
      </Text>
      <Text style={sharedStyles.muted}>Protocolo: {ticketId}</Text>
      {portalUrl ? (
        <Section style={{ textAlign: "center", margin: "24px 0" }}>
          <Button href={portalUrl} style={sharedStyles.button}>
            Acompanhar pelo portal
          </Button>
        </Section>
      ) : (
        <Text style={sharedStyles.paragraph}>
          Você pode acompanhar as atualizações do chamado pelo portal.
        </Text>
      )}
    </BaseLayout>
  );
}

export default function TicketCreatedEmailPreview() {
  return (
    <TicketCreatedEmail
      requesterName="Cliente Teste"
      ticketSubject="Problema ao registrar pagamento"
      ticketId="a1b2c3d4-e5f6-7890-abcd-ef1234567890"
      portalUrl="https://assessorink-so.com/dashboard/org/helenas-ink/support"
    />
  );
}
