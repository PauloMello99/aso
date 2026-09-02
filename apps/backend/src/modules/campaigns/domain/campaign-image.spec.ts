import { campaignImageSrcPrefix } from "./campaign-image";

describe("campaignImageSrcPrefix", () => {
  it("devolve undefined quando SUPABASE_URL está ausente ou vazio", () => {
    expect(campaignImageSrcPrefix(undefined)).toBeUndefined();
    expect(campaignImageSrcPrefix("")).toBeUndefined();
  });

  it("devolve undefined quando SUPABASE_URL não parseia", () => {
    expect(campaignImageSrcPrefix("nao e uma url")).toBeUndefined();
  });

  it("monta o prefixo público do bucket a partir de uma base simples", () => {
    expect(campaignImageSrcPrefix("https://x.supabase.co")).toBe(
      "https://x.supabase.co/storage/v1/object/public/campaign-images/",
    );
  });

  it("normaliza host/porta/path da base — casa com o image.src normalizado pelo walker", () => {
    for (const base of [
      "https://X.SUPABASE.CO:443",
      "https://x.supabase.co/",
      "https://x.supabase.co/algum/path",
    ]) {
      expect(campaignImageSrcPrefix(base)).toBe(
        "https://x.supabase.co/storage/v1/object/public/campaign-images/",
      );
    }
  });
});
