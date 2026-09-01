import { Heading, Link, Text } from "@react-email/components";
import { BaseLayout, sharedStyles } from "./base-layout";

export interface CampaignInactivityEmailProps {
  subject: string;
  bodyParagraphs: string[];
  orgName: string;
  unsubscribeUrl: string;
}

/**
 * Template de campanha do gatilho `inactivity` (T6 Bloco A). Apenas emoldura:
 * o texto autoral chega pronto em `subject` + `bodyParagraphs` (resolvido/
 * interpolado no use-case). Cada `<Text>` é escapado pelo React Email, então
 * HTML colado no corpo custom vira texto visível, nunca markup — por isso
 * `dangerouslySetInnerHTML` é proibido aqui. O rodapé de descadastro é fixo
 * (LGPD/ADR-0018 + CAN-SPAM) e substitui o rodapé padrão do `BaseLayout`
 * ("possui uma conta no ASO") via `footerOverride`, pois o destinatário é
 * cliente da org e não tem conta no ASO.
 */
export function CampaignInactivityEmail({
  subject,
  bodyParagraphs,
  orgName,
  unsubscribeUrl,
}: CampaignInactivityEmailProps) {
  return (
    <BaseLayout
      preview={subject}
      footerOverride={
        <>
          <Text style={sharedStyles.muted}>
            Você recebeu este e-mail porque é cliente de {orgName}.
          </Text>
          <Text style={sharedStyles.muted}>
            <Link href={unsubscribeUrl} style={sharedStyles.linkInline}>
              Não quero mais receber estes e-mails
            </Link>
          </Text>
        </>
      }
    >
      <Heading style={sharedStyles.heading}>{subject}</Heading>
      {bodyParagraphs.map((paragraph, index) => (
        <Text key={index} style={sharedStyles.paragraph}>
          {paragraph}
        </Text>
      ))}
    </BaseLayout>
  );
}

export default function CampaignInactivityEmailPreview() {
  return (
    <CampaignInactivityEmail
      subject="Sentimos sua falta na Helena's Ink"
      bodyParagraphs={["Olá <b>teste</b> & cia", "Segundo parágrafo"]}
      orgName="Helena's Ink"
      unsubscribeUrl="https://assessorink-so.com/preferencias-email/preview-token"
    />
  );
}
