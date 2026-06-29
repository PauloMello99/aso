import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseLayout, sharedStyles } from "./base-layout";

export interface PasswordResetEmailProps {
  /** Nome do usuário (opcional — saudação personalizada). */
  name?: string;
  resetUrl: string;
}

export function PasswordResetEmail({ name, resetUrl }: PasswordResetEmailProps) {
  return (
    <BaseLayout preview="Redefina sua senha do Ink Ops">
      <Heading style={sharedStyles.heading}>Redefinir senha</Heading>
      <Text style={sharedStyles.paragraph}>
        {name ? `Olá, ${name}. ` : "Olá. "}
        Recebemos um pedido para redefinir a senha da sua conta no Ink Ops.
        Clique no botão abaixo para escolher uma nova senha.
      </Text>
      <Section style={{ textAlign: "center", margin: "24px 0" }}>
        <Button href={resetUrl} style={sharedStyles.button}>
          Redefinir senha
        </Button>
      </Section>
      <Text style={sharedStyles.muted}>
        Ou copie e cole este link no navegador:
        <br />
        <span style={sharedStyles.link}>{resetUrl}</span>
      </Text>
      <Text style={sharedStyles.muted}>
        Se você não solicitou a redefinição, pode ignorar este e-mail com
        segurança — sua senha continua a mesma.
      </Text>
    </BaseLayout>
  );
}

// Default export para a preview do `react-email` (email dev).
export default function PasswordResetEmailPreview() {
  return (
    <PasswordResetEmail
      name="Paulo"
      resetUrl="https://app.inkops.app/auth/reset-password#access_token=preview"
    />
  );
}
