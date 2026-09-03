import { Heading, Link, Text } from "@react-email/components";
import type { ReactNode } from "react";
import { BaseLayout, sharedStyles } from "./base-layout";

export interface CampaignInactivityEmailProps {
  subject: string;
  body: ReactNode;
  orgName: string;
  unsubscribeUrl: string;
}

/**
 * Template de campanha do gatilho `inactivity` (T6 Bloco A). Apenas emoldura:
 * `subject` chega resolvido/interpolado e `body` é um `ReactNode` já renderizado
 * por `renderCampaignBody`. O escape é garantido pelo React, então HTML colado
 * no corpo custom vira texto visível, nunca markup — `dangerouslySetInnerHTML`
 * segue proibido aqui. O rodapé de descadastro é fixo (LGPD/ADR-0018 +
 * CAN-SPAM) e substitui o rodapé padrão do `BaseLayout` ("possui uma conta no
 * ASO") via `footerOverride`, pois o destinatário é cliente da org e não tem
 * conta no ASO.
 */
export function CampaignInactivityEmail({
  subject,
  body,
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
      {body}
    </BaseLayout>
  );
}

export default function CampaignInactivityEmailPreview() {
  return (
    <CampaignInactivityEmail
      subject="Sentimos sua falta na Helena's Ink"
      body={<Text style={sharedStyles.paragraph}>Parágrafo de preview</Text>}
      orgName="Helena's Ink"
      unsubscribeUrl="https://assessorink-so.com/preferencias-email/preview-token"
    />
  );
}
