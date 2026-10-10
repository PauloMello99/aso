import { Button, Heading, Link, Section, Text } from "@react-email/components";
import { BaseLayout, sharedStyles } from "./base-layout";

export type AppointmentConfirmationEmailKind = "confirmation" | "reminder";

export interface AppointmentConfirmationEmailProps {
  kind: AppointmentConfirmationEmailKind;
  orgName: string;
  whenLabel: string;
  confirmUrl: string;
  supportEmail?: string;
}

/**
 * Destinatário é cliente da org (sem conta no ASO): o rodapé padrão do
 * `BaseLayout` é substituído via `footerOverride`. Um único CTA leva à página
 * pública, onde o cliente confirma ou cancela; o e-mail em si não é respondido.
 */
export function AppointmentConfirmationEmail({
  kind,
  orgName,
  whenLabel,
  confirmUrl,
  supportEmail,
}: AppointmentConfirmationEmailProps) {
  const isReminder = kind === "reminder";
  return (
    <BaseLayout
      preview={
        isReminder
          ? `Lembrete: seu horário em ${orgName} é amanhã`
          : `Confirme seu horário em ${orgName}`
      }
      supportEmail={supportEmail}
      footerOverride={
        <>
          <Text style={sharedStyles.muted}>
            Você recebeu este e-mail porque um horário foi agendado para você em{" "}
            {orgName}.
          </Text>
          <Text style={sharedStyles.muted}>
            Não responda este e-mail: use o botão acima para confirmar ou cancelar.
            {supportEmail ? (
              <>
                {" "}
                Dúvidas?{" "}
                <Link
                  href={`mailto:${supportEmail}`}
                  style={sharedStyles.linkInline}
                >
                  {supportEmail}
                </Link>
                .
              </>
            ) : null}
          </Text>
        </>
      }
    >
      <Heading style={sharedStyles.heading}>
        {isReminder ? "Seu horário é amanhã" : "Confirme seu horário"}
      </Heading>
      <Text style={sharedStyles.paragraph}>
        {isReminder
          ? `Lembrete do seu horário em ${orgName}: ${whenLabel}.`
          : `Você tem um horário agendado em ${orgName}: ${whenLabel}.`}{" "}
        Clique no botão abaixo para confirmar sua presença ou cancelar.
      </Text>
      <Section style={{ textAlign: "center", margin: "24px 0" }}>
        <Button href={confirmUrl} style={sharedStyles.button}>
          Confirmar ou cancelar
        </Button>
      </Section>
      <Text style={sharedStyles.muted}>
        Ou copie e cole este link no navegador:
        <br />
        <span style={sharedStyles.link}>{confirmUrl}</span>
      </Text>
      <Text style={sharedStyles.muted}>
        O link vale até o horário agendado.
      </Text>
    </BaseLayout>
  );
}

export default function AppointmentConfirmationEmailPreview() {
  return (
    <AppointmentConfirmationEmail
      kind="confirmation"
      orgName="Studio Helena"
      whenLabel="terça-feira, 20/10 às 14:00"
      confirmUrl="https://assessorink-so.com/confirmar-agendamento/preview-token"
    />
  );
}
