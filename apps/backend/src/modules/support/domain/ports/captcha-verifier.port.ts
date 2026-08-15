export const CAPTCHA_VERIFIER = Symbol("CAPTCHA_VERIFIER");

export interface ICaptchaVerifier {
  verify(token: string, remoteIp?: string): Promise<boolean>;
}
