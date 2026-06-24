export type NotificationType =
  | "agenda_reminder"
  | "member_unavailability"
  | "stock_check_reminder";

export interface NotificationProps {
  id: string;
  userId: string;
  orgId: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  readAt: Date | null;
  createdAt: Date;
}

export interface CreateNotificationData {
  userId: string;
  orgId?: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  data?: Record<string, unknown> | null;
}

export class NotificationEntity {
  readonly id: string;
  readonly userId: string;
  readonly orgId: string | null;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string | null;
  readonly data: Record<string, unknown> | null;
  readonly readAt: Date | null;
  readonly createdAt: Date;

  private constructor(props: NotificationProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.orgId = props.orgId;
    this.type = props.type;
    this.title = props.title;
    this.body = props.body;
    this.data = props.data;
    this.readAt = props.readAt;
    this.createdAt = props.createdAt;
  }

  static create(props: NotificationProps): NotificationEntity {
    return new NotificationEntity(props);
  }
}
