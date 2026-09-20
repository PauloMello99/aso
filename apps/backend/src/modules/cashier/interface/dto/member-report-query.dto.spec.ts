import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { MemberReportQueryDto } from "./member-report-query.dto";

// O formato/presenca de from/to e validado no domain (parseReportPeriod), nao
// no DTO: erros do ValidationPipe perdem a mensagem no AllExceptionsFilter.
describe("MemberReportQueryDto", () => {
  it("nao rejeita from/to ausentes ou mal formatados (domain responde)", async () => {
    const dto = plainToInstance(MemberReportQueryDto, { to: "30/09/2026" });

    expect(await validate(dto, { whitelist: true })).toHaveLength(0);
  });

  it("mantem from/to na whitelist e descarta campos extras", async () => {
    const dto = plainToInstance(MemberReportQueryDto, {
      from: "2026-09-01",
      to: "2026-09-30",
      extra: "x",
    });

    await validate(dto, { whitelist: true });

    expect(dto.from).toBe("2026-09-01");
    expect(dto.to).toBe("2026-09-30");
    expect(dto).not.toHaveProperty("extra");
  });
});
