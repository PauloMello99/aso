/** Bucket público (migration 0068): 2 MB, jpeg/png/webp/gif. */
export const CAMPAIGN_IMAGES_BUCKET = "campaign-images";

/**
 * Prefixo da URL pública de um objeto do bucket `campaign-images`, derivado do
 * MESMO `SUPABASE_URL` que o `IStorageProvider.getPublicUrl` usa. É a âncora que
 * o walker (`validateCampaignBody`, via `opts.imageSrcPrefix`) exige em
 * `image.src` para garantir que só imagens que passaram pelo
 * `UploadCampaignImageUseCase` entrem no corpo da campanha.
 *
 * Montado com `new URL(path, base)` para NORMALIZAR host/porta/dot-segments do
 * MESMO jeito que `normalizeUrl` normaliza o `image.src` no walker — sem isso um
 * `SUPABASE_URL` com `:443`, host maiúsculo ou path faria o `startsWith` do
 * walker falhar para TODA imagem enviada. `undefined` quando `SUPABASE_URL` está
 * ausente ou não parseia (ambiente sem storage) — nesse caso o walker mantém só
 * a regra http(s).
 */
export function campaignImageSrcPrefix(
  supabaseUrl: string | undefined,
): string | undefined {
  if (!supabaseUrl) return undefined;
  try {
    return new URL(
      `/storage/v1/object/public/${CAMPAIGN_IMAGES_BUCKET}/`,
      supabaseUrl,
    ).toString();
  } catch {
    return undefined;
  }
}
