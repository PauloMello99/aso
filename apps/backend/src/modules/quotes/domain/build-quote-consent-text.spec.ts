import {
  QUOTE_CONSENT_VERSION,
  buildQuoteConsentSnapshot,
  buildQuoteConsentTexts,
} from "./build-quote-consent-text";

describe("buildQuoteConsentTexts", () => {
  it("includes the studio name in both texts", () => {
    const texts = buildQuoteConsentTexts({ orgName: "Estudio Ink" });
    expect(texts.privacy).toContain("Estudio Ink");
    expect(texts.contactRetention).toContain("Estudio Ink");
  });

  it("links the privacy policy", () => {
    const texts = buildQuoteConsentTexts({ orgName: "X" });
    expect(texts.privacy).toContain("/legal/privacidade");
  });
});

describe("buildQuoteConsentSnapshot", () => {
  const { contactRetention } = buildQuoteConsentTexts({ orgName: "Estudio Ink" });

  it("omits the retention text when not accepted", () => {
    const snapshot = buildQuoteConsentSnapshot({
      orgName: "Estudio Ink",
      contactRetentionAccepted: false,
    });
    expect(snapshot).toContain("Estudio Ink");
    expect(snapshot).not.toContain(contactRetention);
  });

  it("includes the retention text when accepted", () => {
    const snapshot = buildQuoteConsentSnapshot({
      orgName: "Estudio Ink",
      contactRetentionAccepted: true,
    });
    expect(snapshot).toContain(contactRetention);
  });
});

describe("QUOTE_CONSENT_VERSION", () => {
  it("is a stable non-empty string", () => {
    expect(QUOTE_CONSENT_VERSION).toBe("quote-v1-minuta-2026-10");
  });
});
