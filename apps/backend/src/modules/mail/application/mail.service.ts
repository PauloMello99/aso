import { Inject, Injectable } from "@nestjs/common";
import { render } from "@react-email/render";
import type { ReactElement } from "react";
import {
  EMAIL_SENDER,
  IEmailSender,
} from "../domain/ports/email-sender.port";
import { AnamnesisLinkEmail } from "../templates/anamnesis-link-email";
import { AnamnesisSignedCopyEmail } from "../templates/anamnesis-signed-copy";
import { InviteEmail } from "../templates/invite-email";
import { NotificationEmail } from "../templates/notification-email";
import { PasswordResetEmail } from "../templates/password-reset-email";
import { WelcomeEmail } from "../templates/welcome-email";

export interface SendOrgInviteInput {
  to: string;
  orgName: string;
  acceptUrl: string;
}

export interface SendAnamnesisLinkInput {
  to: string;
  customerName: string;
  fillUrl: string;
}

export interface SendSignedAnamnesisResponseCopyInput {
  to: string;
  customerName: string;
  pdfUrl: string;
}

export interface SendPasswordResetInput {
  to: string;
  name?: string;
  resetUrl: string;
}

export interface SendWelcomeInput {
  to: string;
  name: string;
  appUrl?: string;
}

export interface SendNotificationInput {
  to: string;
  title: string;
  body?: string | null;
  actionUrl?: string;
  actionLabel?: string;
}

/**
 * Camada de aplicação de e-mail: renderiza os templates React Email e delega o
 * envio ao IEmailSender. Os métodos **propagam** falha real de envio — cabe ao
 * caller decidir se é crítico (aborta o fluxo) ou best-effort (try/catch).
 * Retornam `false` quando o canal está desabilitado (no-op em dev).
 */
@Injectable()
export class MailService {
  constructor(
    @Inject(EMAIL_SENDER) private readonly sender: IEmailSender,
  ) {}

  async sendOrgInvite(input: SendOrgInviteInput): Promise<boolean> {
    return this.dispatch(
      input.to,
      `Convite para ${input.orgName} no Ink Ops`,
      InviteEmail({ orgName: input.orgName, acceptUrl: input.acceptUrl }),
    );
  }

  async sendAnamnesisLink(input: SendAnamnesisLinkInput): Promise<boolean> {
    return this.dispatch(
      input.to,
      "Preencha sua ficha de anamnese",
      AnamnesisLinkEmail({
        customerName: input.customerName,
        fillUrl: input.fillUrl,
      }),
    );
  }

  async sendSignedAnamnesisResponseCopy(
    input: SendSignedAnamnesisResponseCopyInput,
  ): Promise<boolean> {
    return this.dispatch(
      input.to,
      "Sua ficha de anamnese assinada",
      AnamnesisSignedCopyEmail({
        customerName: input.customerName,
        pdfUrl: input.pdfUrl,
      }),
    );
  }

  async sendPasswordReset(input: SendPasswordResetInput): Promise<boolean> {
    return this.dispatch(
      input.to,
      "Redefinir sua senha do Ink Ops",
      PasswordResetEmail({ name: input.name, resetUrl: input.resetUrl }),
    );
  }

  async sendWelcome(input: SendWelcomeInput): Promise<boolean> {
    return this.dispatch(
      input.to,
      "Bem-vindo ao Ink Ops",
      WelcomeEmail({ name: input.name, appUrl: input.appUrl }),
    );
  }

  async sendNotification(input: SendNotificationInput): Promise<boolean> {
    return this.dispatch(
      input.to,
      input.title,
      NotificationEmail({
        title: input.title,
        body: input.body,
        actionUrl: input.actionUrl,
        actionLabel: input.actionLabel,
      }),
    );
  }

  private async dispatch(
    to: string,
    subject: string,
    element: ReactElement,
  ): Promise<boolean> {
    const [html, text] = await Promise.all([
      render(element),
      render(element, { plainText: true }),
    ]);
    return this.sender.send({ to, subject, html, text });
  }
}
