/**
 * Versão vigente dos Termos de Uso exigidos no cadastro. Fonte de verdade no servidor —
 * o valor enviado pelo cliente (`SignUpDto.acceptedTermsVersion`) é apenas comparado
 * contra esta constante, nunca gravado sem validação. Deve ser mantida em sincronia com
 * `LEGAL_VERSIONS.terms` em `apps/frontend/src/features/legal/constants/entity.ts`.
 */
export const CURRENT_TERMS_VERSION = "2026-07-27";
