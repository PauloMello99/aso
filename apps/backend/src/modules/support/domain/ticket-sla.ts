export type TicketSlaAlertType =
  | "first_response_near"
  | "first_response_breached"
  | "resolution_near"
  | "resolution_breached";

export interface TicketSlaCategory {
  slaFirstResponseMinutes: number;
  slaResolutionMinutes: number;
}

export interface TicketSlaDueDates {
  slaFirstResponseDueAt: Date;
  slaResolutionDueAt: Date;
}

export function computeSlaDueDates(
  createdAt: Date,
  category: TicketSlaCategory,
): TicketSlaDueDates {
  return {
    slaFirstResponseDueAt: new Date(
      createdAt.getTime() + category.slaFirstResponseMinutes * 60_000,
    ),
    slaResolutionDueAt: new Date(
      createdAt.getTime() + category.slaResolutionMinutes * 60_000,
    ),
  };
}

export function isSlaBreached(now: Date, dueAt: Date): boolean {
  return now.getTime() > dueAt.getTime();
}

export function isSlaNearBreach(
  now: Date,
  dueAt: Date,
  createdAt: Date,
  warningThresholdRatio = 0.2,
): boolean {
  if (isSlaBreached(now, dueAt)) return false;

  const windowMs = dueAt.getTime() - createdAt.getTime();
  if (windowMs <= 0) return false;

  const remainingMs = dueAt.getTime() - now.getTime();
  return remainingMs <= windowMs * warningThresholdRatio;
}
