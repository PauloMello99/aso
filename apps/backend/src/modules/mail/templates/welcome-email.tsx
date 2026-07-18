import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseLayout, sharedStyles } from "./base-layout";

export interface WelcomeEmailProps {
  name: string;
  appUrl?: string;
}

export function WelcomeEmail({ name, appUrl }: WelcomeEmailProps) {
  return (
    <BaseLayout preview="Bem-vindo ao Ink Ops">
      <Heading style={sharedStyles.heading}>Bem-vindo, {name}! 👋</Heading>
      <Text style={sharedStyles.paragraph}>
        Sua conta no <strong>Ink Ops</strong> está pronta. Agora você pode criar
        seu estúdio, convidar a equipe e gerenciar estoque, agenda e clientes num
        só lugar.
      </Text>
      {appUrl ? (
        <Section style={{ textAlign: "center", margin: "24px 0" }}>
          <Button href={appUrl} style={sharedStyles.button}>
            Acessar o Ink Ops
          </Button>
        </Section>
      ) : null}
      <Text style={sharedStyles.muted}>
        Qualquer dúvida, é só responder a este e-mail. Boa tatuagem! 🖤
      </Text>
    </BaseLayout>
  );
}

export default function WelcomeEmailPreview() {
  return <WelcomeEmail name="Paulo" appUrl="https://app.inkops.app" />;
}
