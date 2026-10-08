import {
  generateConfirmationToken,
  hashConfirmationToken,
  isWellFormedConfirmationToken,
} from "./confirmation-token";

describe("confirmation-token", () => {
  it("gera token base64url de 43 caracteres e distinto a cada chamada", () => {
    const a = generateConfirmationToken();
    const b = generateConfirmationToken();

    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(isWellFormedConfirmationToken(a)).toBe(true);
    expect(a).not.toBe(b);
  });

  it("hash é sha256 hex determinístico e diferente do token", () => {
    const token = generateConfirmationToken();
    const hash = hashConfirmationToken(token);

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashConfirmationToken(token)).toBe(hash);
    expect(hash).not.toBe(token);
    expect(hashConfirmationToken("outro")).not.toBe(hash);
  });

  it("hash conhecido (sha256 de 'abc')", () => {
    expect(hashConfirmationToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it.each([
    ["", false],
    ["curto", false],
    ["a".repeat(42), false],
    ["a".repeat(44), false],
    ["a".repeat(42) + "=", false],
    ["a".repeat(42) + "+", false],
    ["a".repeat(42) + " ", false],
    ["a".repeat(43), true],
    ["A_-".repeat(14) + "A", true],
  ])("isWellFormedConfirmationToken(%j) => %s", (value, expected) => {
    expect(isWellFormedConfirmationToken(value)).toBe(expected);
  });
});
