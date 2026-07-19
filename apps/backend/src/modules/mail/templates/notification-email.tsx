import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseLayout, sharedStyles } from "./base-layout";

export interface NotificationEmailProps {
  title: string;
  body?: string | null;
  actionUrl?: string;
  actionLabel?: string;
  supportEmail?: string;
}

export function NotificationEmail({
  title,
  body,
  actionUrl,
  actionLabel,
  supportEmail,
}: NotificationEmailProps) {
  return (
    <BaseLayout preview={title} supportEmail={supportEmail}>
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
