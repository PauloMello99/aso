import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
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

@Injectable()
export class MailService {
  private readonly supportEmail: string | undefined;

  constructor(
    @Inject(EMAIL_SENDER) private readonly sender: IEmailSender,
    config: ConfigService,
  ) {
    this.supportEmail = config.get<string>("SUPPORT_EMAIL");
  }

  async sendOrgInvite(input: SendOrgInviteInput): Promise<boolean> {
    return this.dispatch(
      input.to,
      `Convite para ${input.orgName} no ASO`,
      InviteEmail({
        orgName: input.orgName,
        acceptUrl: input.acceptUrl,
        supportEmail: this.supportEmail,
      }),
    );
  }

  async sendAnamnesisLink(input: SendAnamnesisLinkInput): Promise<boolean> {
    return this.dispatch(
      input.to,
      "Preencha sua ficha de anamnese",
      AnamnesisLinkEmail({
        customerName: input.customerName,
        fillUrl: input.fillUrl,
        supportEmail: this.supportEmail,
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
        supportEmail: this.supportEmail,
      }),
    );
  }

  async sendPasswordReset(input: SendPasswordResetInput): Promise<boolean> {
    return this.dispatch(
      input.to,
      "Redefinir sua senha do ASO",
      PasswordResetEmail({
        name: input.name,
        resetUrl: input.resetUrl,
        supportEmail: this.supportEmail,
      }),
    );
  }

  async sendWelcome(input: SendWelcomeInput): Promise<boolean> {
    return this.dispatch(
      input.to,
      "Bem-vindo ao ASO",
      WelcomeEmail({
        name: input.name,
        appUrl: input.appUrl,
        supportEmail: this.supportEmail,
      }),
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
        supportEmail: this.supportEmail,
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
