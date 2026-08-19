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
import { CustomerSelfRegistrationLinkEmail } from "../templates/customer-self-registration-link-email";
import { CustomerUpdateLinkEmail } from "../templates/customer-update-link-email";
import { InviteEmail } from "../templates/invite-email";
import { NotificationEmail } from "../templates/notification-email";
import { PasswordResetEmail } from "../templates/password-reset-email";
import { WelcomeEmail } from "../templates/welcome-email";
import { TicketCreatedEmail } from "../templates/ticket-created";
import { TicketResponseAddedEmail } from "../templates/ticket-response-added";
import { TicketStatusChangedEmail } from "../templates/ticket-status-changed";
import {
  TicketSlaAlertEmail,
  TicketSlaAlertType,
} from "../templates/ticket-sla-alert";

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

export interface SendCustomerSelfRegistrationLinkInput {
  to: string;
  orgName: string;
  fillUrl: string;
}

export interface SendCustomerUpdateLinkInput {
  to: string;
  orgName: string;
  customerName: string;
  fillUrl: string;
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

export interface SendTicketCreatedInput {
  to: string;
  requesterName: string;
  ticketSubject: string;
  ticketId: string;
  portalUrl?: string;
  replyTo?: string;
}

export interface SendTicketResponseAddedInput {
  to: string;
  requesterName: string;
  ticketSubject: string;
  responseBody: string;
  portalUrl: string;
  replyTo?: string;
}

export interface SendTicketStatusChangedInput {
  to: string;
  requesterName: string;
  ticketSubject: string;
  newStatus: string;
  portalUrl?: string;
  replyTo?: string;
}

export interface SendTicketSlaAlertInput {
  to: string;
  ticketId: string;
  ticketSubject: string;
  orgName: string;
  alertType: TicketSlaAlertType;
  queueUrl?: string;
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

  async sendCustomerSelfRegistrationLink(
    input: SendCustomerSelfRegistrationLinkInput,
  ): Promise<boolean> {
    return this.dispatch(
      input.to,
      "Complete seu cadastro e sua ficha de anamnese",
      CustomerSelfRegistrationLinkEmail({
        orgName: input.orgName,
        fillUrl: input.fillUrl,
        supportEmail: this.supportEmail,
      }),
    );
  }

  async sendCustomerUpdateLink(
    input: SendCustomerUpdateLinkInput,
  ): Promise<boolean> {
    return this.dispatch(
      input.to,
      "Atualize seus dados cadastrais",
      CustomerUpdateLinkEmail({
        orgName: input.orgName,
        customerName: input.customerName,
        fillUrl: input.fillUrl,
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

  async sendTicketCreated(input: SendTicketCreatedInput): Promise<boolean> {
    return this.dispatch(
      input.to,
      `Recebemos seu chamado: ${input.ticketSubject}`,
      TicketCreatedEmail({
        requesterName: input.requesterName,
        ticketSubject: input.ticketSubject,
        ticketId: input.ticketId,
        portalUrl: input.portalUrl,
        supportEmail: this.supportEmail,
      }),
      input.replyTo,
    );
  }

  async sendTicketResponseAdded(
    input: SendTicketResponseAddedInput,
  ): Promise<boolean> {
    return this.dispatch(
      input.to,
      `Nova resposta no seu chamado: ${input.ticketSubject}`,
      TicketResponseAddedEmail({
        requesterName: input.requesterName,
        ticketSubject: input.ticketSubject,
        responseBody: input.responseBody,
        portalUrl: input.portalUrl,
        supportEmail: this.supportEmail,
      }),
      input.replyTo,
    );
  }

  async sendTicketStatusChanged(
    input: SendTicketStatusChangedInput,
  ): Promise<boolean> {
    return this.dispatch(
      input.to,
      `Seu chamado agora está: ${input.newStatus}`,
      TicketStatusChangedEmail({
        requesterName: input.requesterName,
        ticketSubject: input.ticketSubject,
        newStatus: input.newStatus,
        portalUrl: input.portalUrl,
        supportEmail: this.supportEmail,
      }),
      input.replyTo,
    );
  }

  async sendTicketSlaAlert(input: SendTicketSlaAlertInput): Promise<boolean> {
    return this.dispatch(
      input.to,
      `Alerta de SLA: ${input.ticketSubject}`,
      TicketSlaAlertEmail({
        ticketId: input.ticketId,
        ticketSubject: input.ticketSubject,
        orgName: input.orgName,
        alertType: input.alertType,
        queueUrl: input.queueUrl,
        supportEmail: this.supportEmail,
      }),
    );
  }

  private async dispatch(
    to: string,
    subject: string,
    element: ReactElement,
    replyTo?: string,
  ): Promise<boolean> {
    const [html, text] = await Promise.all([
      render(element),
      render(element, { plainText: true }),
    ]);
    return this.sender.send({
      to,
      subject,
      html,
      text,
      ...(replyTo ? { replyTo } : {}),
    });
  }
}
