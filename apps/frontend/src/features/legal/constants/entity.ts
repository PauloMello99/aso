/**
 * Fonte única de dados da pessoa jurídica e versionamento de documentos legais.
 *
 * ATENÇÃO: os valores de `LEGAL_ENTITY` estão como placeholder e DEVEM ser substituídos
 * pelos dados reais (razão social, CNPJ, endereço físico e encarregado/DPO) antes do
 * site ir ao ar — exigência de identificação do fornecedor (Decreto 7.962/2013 + CDC)
 * e do encarregado (LGPD art. 41). Ver .memory/adr/0018-conformidade-legal-lgpd-tier1.md.
 */
export const LEGAL_ENTITY = {
  razaoSocial: "[PREENCHER: Razão Social Ltda.]",
  nomeFantasia: "ASO",
  cnpj: "[PREENCHER: 00.000.000/0000-00]",
  endereco: "[PREENCHER: logradouro, número, bairro, cidade/UF, CEP]",
  emailContato: "[PREENCHER: contato@example.com]",
  encarregado: {
    nome: "[PREENCHER: nome do encarregado/DPO]",
    email: "[PREENCHER: dpo@example.com]",
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
