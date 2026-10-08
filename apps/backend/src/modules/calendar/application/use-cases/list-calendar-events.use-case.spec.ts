import { CalendarEventEntity } from "../../domain/calendar-event.entity";
import type { ICalendarEventRepository } from "../../domain/calendar-event.repository.interface";
import { ListCalendarEventsUseCase } from "./list-calendar-events.use-case";

function buildFakeEvent(assignedTo: string): CalendarEventEntity {
  return CalendarEventEntity.create({
    id: `ev-${assignedTo}`,
    orgId: "org-1",
    assignedTo,
    customerId: null,
    createdBy: assignedTo,
    type: "appointment",
    status: "scheduled",
    title: "Tattoo",
    description: null,
    startsAt: new Date("2026-10-20T17:00:00.000Z"),
    endsAt: new Date("2026-10-20T19:00:00.000Z"),
    allDay: false,
    visibility: "shared",
    customerEmail: "ana@example.com",
    confirmationStatus: "pending",
    confirmationRequestedAt: new Date("2026-10-01T12:00:00.000Z"),
    confirmationSentAt: null,
    confirmationRespondedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function build(role: "owner" | "employee") {
  const repo = {
    getMembership: jest
      .fn()
      .mockResolvedValue({ userId: "user-1", role, name: "Helena" }),
    findInRange: jest
      .fn()
      .mockResolvedValue([buildFakeEvent("user-1"), buildFakeEvent("user-2")]),
  } as unknown as jest.Mocked<ICalendarEventRepository>;
  return new ListCalendarEventsUseCase(repo);
}

const input = {
  orgId: "org-1",
  authId: "auth-1",
  start: new Date("2026-10-01T00:00:00.000Z"),
  end: new Date("2026-11-01T00:00:00.000Z"),
};

describe("ListCalendarEventsUseCase — e-mail do cliente", () => {
  it("funcionário não vê o e-mail nem a confirmação de evento compartilhado de outro", async () => {
    const events = await build("employee").execute(input);

    const own = events.find((e) => e.assignedTo === "user-1");
    const other = events.find((e) => e.assignedTo === "user-2");
    expect(own?.customerEmail).toBe("ana@example.com");
    expect(own?.confirmationStatus).toBe("pending");
    expect(other?.customerEmail).toBeNull();
    expect(other?.confirmationStatus).toBeNull();
    expect(other?.title).toBe("Tattoo");
  });

  it("owner vê o e-mail de todos", async () => {
    const events = await build("owner").execute(input);

    expect(events.map((e) => e.customerEmail)).toEqual([
      "ana@example.com",
      "ana@example.com",
    ]);
  });
});
