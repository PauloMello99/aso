import {
  ANAMNESIS_CONSENT_VERSION,
  buildAnamnesisConsentText,
} from "./build-anamnesis-consent-text";

describe("buildAnamnesisConsentText", () => {
  it("retorna a versão vigente e menciona o nome da organização como controladora", () => {
    const { version, text } = buildAnamnesisConsentText({
      orgName: "Estúdio Exemplo",
    });

    expect(version).toBe(ANAMNESIS_CONSENT_VERSION);
    expect(text).toContain("Estúdio Exemplo");
    expect(text.toLowerCase()).toContain("controlador");
    expect(text.toLowerCase()).toContain("sensíveis");
    expect(text.toLowerCase()).toContain("endereço ip");
  });

  it("é determinístico para o mesmo nome de organização", () => {
    const first = buildAnamnesisConsentText({ orgName: "Estúdio A" });
    const second = buildAnamnesisConsentText({ orgName: "Estúdio A" });
    expect(first.text).toBe(second.text);
  });
});
