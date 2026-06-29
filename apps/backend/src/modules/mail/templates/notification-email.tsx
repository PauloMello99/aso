import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseLayout, sharedStyles } from "./base-layout";

export interface NotificationEmailProps {
  title: string;
  body?: string | null;
  /** CTA opcional (ex.: link para o agendamento / estoque). */
  actionUrl?: string;
  actionLabel?: string;
}

/**
 * Template genérico usado por todas as notificações disparadas pelo
 * NotificationService (lembrete de agenda, conferência de estoque, etc.).
 */
export function NotificationEmail({
  title,
  body,
  actionUrl,
  actionLabel,
}: NotificationEmailProps) {
  return (
    <BaseLayout preview={title}>
      <Heading style={sharedStyles.heading}>{title}</Heading>
      {body ? <Text style={sharedStyles.paragraph}>{body}</Text> : null}
      {actionUrl ? (
        <Section style={{ textAlign: "center", margin: "24px 0" }}>
          <Button href={actionUrl} style={sharedStyles.button}>
            {actionLabel ?? "Ver detalhes"}
          </Button>
        </Section>
      ) : null}
    </BaseLayout>
  );
}

// Default export para a preview do `react-email` (email dev).
export default function NotificationEmailPreview() {
  return (
    <NotificationEmail
      title="Hora de conferir o estoque"
      body="Já se passaram 30 dias desde a última conferência de estoque."
      actionUrl="https://app.inkops.app/dashboard"
      actionLabel="Conferir estoque"
    />
  );
}
