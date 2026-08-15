import { TicketInvalidException } from "./exceptions/ticket-invalid.exception";

export type TicketAuthorType = "customer" | "agent" | "system";

const BODY_MIN_LENGTH = 1;
const BODY_MAX_LENGTH = 5000;

export interface TicketResponseEntityProps {
  id: string;
  ticketId: string;
  orgId: string | null;
  authorType: TicketAuthorType;
  authorUserId: string | null;
  body: string;
  isInternalNote: boolean;
  createdAt: Date;
}

export interface CreateTicketResponseData {
  id: string;
  ticketId: string;
  orgId: string | null;
  authorType: TicketAuthorType;
  authorUserId: string | null;
  body: string;
  isInternalNote: boolean;
  createdAt: Date;
}

export class TicketResponseEntity {
  readonly id: string;
  readonly ticketId: string;
  readonly orgId: string | null;
  readonly authorType: TicketAuthorType;
  readonly authorUserId: string | null;
  readonly body: string;
  readonly isInternalNote: boolean;
  readonly createdAt: Date;

  private constructor(props: TicketResponseEntityProps) {
    this.id = props.id;
    this.ticketId = props.ticketId;
    this.orgId = props.orgId;
    this.authorType = props.authorType;
    this.authorUserId = props.authorUserId;
    this.body = props.body;
    this.isInternalNote = props.isInternalNote;
    this.createdAt = props.createdAt;
  }

  static create(data: CreateTicketResponseData): TicketResponseEntity {
    const body = data.body.trim();

    if (body.length < BODY_MIN_LENGTH || body.length > BODY_MAX_LENGTH) {
      throw new TicketInvalidException(
        `Ticket response body must be between ${BODY_MIN_LENGTH} and ${BODY_MAX_LENGTH} characters`,
      );
    }

    return new TicketResponseEntity({ ...data, body });
  }
}
