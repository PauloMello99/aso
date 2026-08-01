/**
 * Fonte única de dados da pessoa jurídica e versionamento de documentos legais.
 *
 * Preenchido em 2026-07-31 (identificação do fornecedor — Decreto 7.962/2013 + CDC —
 * e do encarregado — LGPD art. 41). Ver .memory/adr/0018-conformidade-legal-lgpd-tier1.md.
 * Ao alterar qualquer valor abaixo, revisar as 4 páginas legais e o footer, que exibem
 * esses dados publicamente.
 */
export const LEGAL_ENTITY = {
  razaoSocial: "JOAO PEDRO SIQUEIRA PERIM 46599540805",
  nomeFantasia: "ASO",
  cnpj: "42.879.564/0001-96",
  endereco: "Rua Silva Jardim 1278, Bairro Alto, Piracicaba/SP, 13.419-140",
  emailContato: "contato@assessorink-so.com",
  encarregado: {
    nome: "João Pedro Siqueira Perim",
    email: "jpperim06@gmail.com",
  },
} as const

/**
 * Versão vigente de cada documento legal (data ISO da última atualização).
 * Ao alterar o texto de um documento, atualize a versão correspondente — o aceite no
 * cadastro e o consentimento da anamnese gravam essa versão junto com o registro.
 */
export const LEGAL_VERSIONS = {
  terms: "2026-07-27",
  privacy: "2026-07-27",
  cookies: "2026-07-27",
  dpa: "2026-07-27",
} as const

export const LEGAL_ROUTES = {
  terms: "/legal/termos",
  privacy: "/legal/privacidade",
  cookies: "/legal/cookies",
  dpa: "/legal/tratamento-de-dados",
} as const
