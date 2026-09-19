import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { isOnboardingSeenMap, UpdateMeDto } from "./update-me.dto";

async function errorsFor(payload: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(UpdateMeDto, payload));
  return errors.map((e) => e.property);
}

describe("UpdateMeDto.onboardingSeen", () => {
  it("aceita mapa válido e ausência do campo", async () => {
    expect(await errorsFor({ onboardingSeen: { caixa: 1, "meus-clientes": 1000 } })).toEqual([]);
    expect(await errorsFor({ onboardingSeen: { "/caixa": 1, "a/b": 2 } })).toEqual([]);
    expect(await errorsFor({ onboardingSeen: {} })).toEqual([]);
    expect(await errorsFor({})).toEqual([]);
  });

  it.each([
    ["chave com maiúscula", { Caixa: 1 }],
    ["chave com underscore", { caixa_x: 1 }],
    ["chave vazia", { "": 1 }],
    ["chave com mais de 32 caracteres", { ["a".repeat(33)]: 1 }],
    ["valor zero", { caixa: 0 }],
    ["valor acima de 1000", { caixa: 1001 }],
    ["valor não inteiro", { caixa: 1.5 }],
    ["valor string", { caixa: "1" }],
  ])("rejeita %s", async (_label, onboardingSeen) => {
    expect(await errorsFor({ onboardingSeen })).toContain("onboardingSeen");
  });

  it("chave __proto__: o validador rejeita a chave própria e o class-transformer a descarta sem poluir Object.prototype", () => {
    const payload = JSON.parse('{"onboardingSeen": {"__proto__": 1}}') as Record<
      string,
      unknown
    >;

    expect(isOnboardingSeenMap(payload.onboardingSeen)).toBe(false);

    const dto = plainToInstance(UpdateMeDto, payload);
    expect(Object.keys(dto.onboardingSeen ?? {})).not.toContain("__proto__");
    expect(({} as Record<string, unknown>)["1"]).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty("polluted");
  });

  it("rejeita mapa com mais de 30 chaves e aceita exatamente 30", async () => {
    const build = (n: number): Record<string, number> =>
      Object.fromEntries(Array.from({ length: n }, (_, i) => [`m${i}`, 1]));

    expect(await errorsFor({ onboardingSeen: build(31) })).toContain("onboardingSeen");
    expect(await errorsFor({ onboardingSeen: build(30) })).toEqual([]);
  });

  it("rejeita null (400) em vez de tratá-lo como omissão", async () => {
    expect(await errorsFor({ onboardingSeen: null })).toContain("onboardingSeen");
  });

  it.each([["array", [1]], ["string", "x"], ["número", 5]])(
    "rejeita valor que não é objeto (%s)",
    async (_label, onboardingSeen) => {
      expect(await errorsFor({ onboardingSeen })).toContain("onboardingSeen");
    },
  );
});
