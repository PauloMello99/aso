import type { CalendarEventEntity } from "./calendar-event.entity";
import {
  planConfirmationChange,
  type NextConfirmationState,
} from "./plan-confirmation-change";

type Existing = Pick<
  CalendarEventEntity,
  "type" | "startsAt" | "customerEmail" | "confirmationStatus"
>;

// Bem no futuro: planConfirmationChange só inicia ciclo com startsAt > now.
const STARTS_AT = new Date("2099-10-20T14:00:00.000Z");

function buildFakeExisting(overrides: Partial<Existing> = {}): Existing {
  return {
    type: "appointment",
    startsAt: STARTS_AT,
    customerEmail: "ana@example.com",
    confirmationStatus: "pending",
    ...overrides,
  };
}

function buildFakeNext(
  overrides: Partial<NextConfirmationState> = {},
): NextConfirmationState {
  return {
    type: "appointment",
    status: "scheduled",
    startsAt: new Date(STARTS_AT.getTime()),
    customerEmail: "ana@example.com",
    ...overrides,
  };
}

describe("planConfirmationChange — relógio", () => {
  const NOW = new Date("2026-10-21T00:00:00.000Z");

  it("evento novo que já começou (startsAt <= now) não inicia ciclo", () => {
    expect(
      planConfirmationChange(
        null,
        buildFakeNext({ startsAt: new Date("2026-10-20T14:00:00.000Z") }),
        NOW,
      ),
    ).toBe("keep");
    expect(
      planConfirmationChange(
        null,
        buildFakeNext({ startsAt: new Date(NOW.getTime()) }),
        NOW,
      ),
    ).toBe("keep");
  });

  it("reagendamento para o passado não reinicia o ciclo", () => {
    expect(
      planConfirmationChange(
        buildFakeExisting({ startsAt: new Date("2026-10-30T14:00:00.000Z") }),
        buildFakeNext({ startsAt: new Date("2026-10-20T14:00:00.000Z") }),
        NOW,
      ),
    ).toBe("keep");
  });

  it("clear continua valendo para evento no passado", () => {
    expect(
      planConfirmationChange(
        buildFakeExisting(),
        buildFakeNext({ customerEmail: null }),
        NOW,
      ),
    ).toBe("clear");
  });
});

describe("planConfirmationChange", () => {
  describe("evento novo", () => {
    it("atendimento com e-mail inicia o ciclo", () => {
      expect(planConfirmationChange(null, buildFakeNext())).toBe("start_cycle");
    });

    it("atendimento sem e-mail (ou só espaços) mantém", () => {
      expect(
        planConfirmationChange(null, buildFakeNext({ customerEmail: null })),
      ).toBe("keep");
      expect(
        planConfirmationChange(null, buildFakeNext({ customerEmail: "  " })),
      ).toBe("keep");
    });

    it("indisponibilidade nunca inicia ciclo", () => {
      expect(
        planConfirmationChange(null, buildFakeNext({ type: "unavailability" })),
      ).toBe("keep");
    });
  });

  describe("evento existente", () => {
    it("mudança só de título/descrição (mesmos horário e e-mail) mantém", () => {
      expect(planConfirmationChange(buildFakeExisting(), buildFakeNext())).toBe(
        "keep",
      );
    });

    it("reagendamento (startsAt diferente) reinicia o ciclo", () => {
      expect(
        planConfirmationChange(
          buildFakeExisting(),
          buildFakeNext({ startsAt: new Date("2099-10-21T14:00:00.000Z") }),
        ),
      ).toBe("start_cycle");
    });

    it("mesmo instante em outra instância de Date não reinicia", () => {
      expect(
        planConfirmationChange(
          buildFakeExisting(),
          buildFakeNext({ startsAt: new Date(STARTS_AT.toISOString()) }),
        ),
      ).toBe("keep");
    });

    it("troca de e-mail reinicia o ciclo", () => {
      expect(
        planConfirmationChange(
          buildFakeExisting(),
          buildFakeNext({ customerEmail: "bia@example.com" }),
        ),
      ).toBe("start_cycle");
    });

    it("mesmo e-mail com caixa/espaços diferentes não reinicia", () => {
      expect(
        planConfirmationChange(
          buildFakeExisting(),
          buildFakeNext({ customerEmail: "  ANA@Example.com " }),
        ),
      ).toBe("keep");
    });

    it("adicionar e-mail a evento sem e-mail inicia o ciclo", () => {
      expect(
        planConfirmationChange(
          buildFakeExisting({ customerEmail: null, confirmationStatus: null }),
          buildFakeNext(),
        ),
      ).toBe("start_cycle");
    });

    it("remover o e-mail encerra o ciclo", () => {
      expect(
        planConfirmationChange(
          buildFakeExisting(),
          buildFakeNext({ customerEmail: null }),
        ),
      ).toBe("clear");
    });

    it("converter para indisponibilidade encerra o ciclo", () => {
      expect(
        planConfirmationChange(
          buildFakeExisting(),
          buildFakeNext({ type: "unavailability" }),
        ),
      ).toBe("clear");
    });

    it("evento sem ciclo e sem e-mail convertido para indisponibilidade mantém", () => {
      expect(
        planConfirmationChange(
          buildFakeExisting({ customerEmail: null, confirmationStatus: null }),
          buildFakeNext({ type: "unavailability", customerEmail: null }),
        ),
      ).toBe("keep");
    });

    it("cancelamento do evento mantém, mesmo com reagendamento", () => {
      expect(
        planConfirmationChange(
          buildFakeExisting(),
          buildFakeNext({
            status: "canceled",
            startsAt: new Date("2099-10-22T14:00:00.000Z"),
          }),
        ),
      ).toBe("keep");
    });

    it("unavailability convertida em atendimento com e-mail inicia o ciclo", () => {
      expect(
        planConfirmationChange(
          buildFakeExisting({
            type: "unavailability",
            customerEmail: null,
            confirmationStatus: null,
          }),
          buildFakeNext(),
        ),
      ).toBe("start_cycle");
    });
  });
});
