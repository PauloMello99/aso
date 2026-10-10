import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ScheduleQuoteRequestDto } from "./schedule-quote-request.dto";

async function run(overrides: Record<string, unknown> = {}) {
  const dto = plainToInstance(ScheduleQuoteRequestDto, {
    startsAt: "2099-10-20T17:00:00.000Z",
    durationMinutes: 60,
    ...overrides,
  });
  return validate(dto, { whitelist: true });
}

describe("ScheduleQuoteRequestDto", () => {
  it("aceita um corpo valido", async () => {
    expect(await run()).toHaveLength(0);
  });

  it.each([15, 720])("aceita a duracao limite %d", async (durationMinutes) => {
    expect(await run({ durationMinutes })).toHaveLength(0);
  });

  it.each([10, 14, 721, 1.5, "60", null])(
    "rejeita a duracao %j",
    async (durationMinutes) => {
      expect((await run({ durationMinutes })).length).toBeGreaterThan(0);
    },
  );

  it.each(["lixo", "", "2099-13-45", 123, null])(
    "rejeita startsAt %j",
    async (startsAt) => {
      expect((await run({ startsAt })).length).toBeGreaterThan(0);
    },
  );
});
