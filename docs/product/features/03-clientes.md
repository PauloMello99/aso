# 03 — Clientes (Customers) · ✅ Implementado (ajustes pendentes)

## Visão
Cadastro dos clientes do estúdio. Entidade de **dados** gerenciada pela org — o cliente
**não** acessa o sistema na V1 (`user_id` nullable, reservado para o portal futuro).

## Estado atual (ink-ops)
Módulo backend `modules/customers` (Clean Architecture) + feature frontend `features/clients`.
- Tabela `customers`: `id, org_id, user_id(null), origin_id, created_by, name, email, phone,
  birth_date, gender, address, notes, enabled, created_at, updated_at`.
- CRUD completo + busca (`?search=` nome/email/telefone) + filtro `?enabled=true`; soft toggle
  ativo/inativo; delete real. Guardas: `AuthGuard` + `OrgMembershipGuard`.

## Legado a portar (ink-house-studio)
`customers`: `name, birth_date, gender, address, contact_phone, email, enabled, credits,
origin_id`. Sem `org_id`, sem `city`, sem observações/anexos. `credits` (real) usado como
fidelidade (ver spec 05/07). Mutations: create, update, **update-status** (enabled).

## Decisões das reuniões (11/06)
- **Campos núcleo padronizados:** Nome, Telefone, E-mail, **Cidade**, Origem.
- **Créditos:** específico da Ink House → **fora da estrutura núcleo**. Substituto: cashback
  opcional por org (ver spec 07).
- **Observações + anexos:** cada cliente pode ter observações e **anexos** (imagem/documento).
  Caso: ficha de anamnese. Implementar como **estrutura genérica** de documentos do cliente,
  não uma feature "ficha".

## Comportamento alvo (V1)
1. **Campos:** manter os atuais e **adicionar `city`**. `notes` cobre observações. `gender`,
   `birth_date`, `address` permanecem opcionais.
2. **Origem:** `origin_id` referencia categoria padronizada (ver spec 04) — não texto livre.
3. **Anexos:** nova relação `customer_attachments` (`id, org_id, customer_id, file_url,
   file_name, content_type, uploaded_by, created_at`) usando Supabase Storage (bucket por org
   ou path `org_id/customer_id/...`). Tipos aceitos: imagem + PDF/documento.
4. **Ativo/inativo:** cliente desabilitado **não pode** receber novos serviços (legado bloqueia
   — `CUSTOMER_DISABLED_ERROR`). Manter a regra na criação de serviço.
5. **Isolamento:** todo acesso filtra por `org_id`; nunca retornar cliente de outra org.

## Regras de negócio
- `name` obrigatório; `email` válido se presente; telefone livre; cidade livre.
- Excluir cliente: avaliar **soft-delete** vs hard-delete (hoje é hard). Como serviços
  referenciam `customer_id`, preferir **bloquear hard-delete** se houver histórico, ou usar
  `enabled=false`. *(Decisão a confirmar.)*
- Cashback/créditos: **não** no núcleo; quando a feature de cashback existir, será saldo por
  org (ver spec 07).

## Pendências
- ~~Adicionar `city`~~ ✅ **feito** (migração 0002, schema/DTO/mapper/repo + form — 2026-06-14).
- Modelar e implementar `customer_attachments` (Storage + upload no frontend).
- Definir política de exclusão (soft vs hard) frente ao histórico de serviços.

## Revisão das reuniões (04/06 · 11/06)
> Detalhe granular extraído das transcrições — ver
> [revisão por módulo §3](../reunioes/2026-revisao-funcionalidades-por-modulo.md#3-clientes--origem-do-cliente).
> Status: ✅ feito · 🟡 parcial · ⏳ pendente V1 · 🔮 V2/externo.

**Comportamento de form/UX**
- ✅ **Endereço estruturado** (linha 1, complemento, cidade, estado, país) — saiu o texto livre.
- ✅ **Telefone com máscara internacional** (aceita qualquer país) — saiu o formato só-BR.
- ✅ **Validação de e-mail** (formato).
- 🔮 **Verificação ativa de contato** (double-check por e-mail/WhatsApp ao cadastrar) — depende de
  mensageria; cliente raramente confirma.

**Campos que entraram**
- ✅ **Exibir cidade** na listagem.
- 🟡 **Observações + anexos de imagem/documento** (estrutura **genérica**, ex.: ficha de anamnese
  escaneada) — `customer_attachments` ainda pendente.

**Campos / features que saíram**
- ✅ **Campo "crédito"** sai do núcleo → vira **cashback opcional por org** (spec 07/13).

**Origem do cliente**
- ✅ **3 categorias fixas** (Indicação · Rede social do profissional · Rede social do estúdio) —
  ver spec 04.

**Decisões**
- ⏳ **Ficha de anamnese**: V1 segue **física** (estúdio); o sistema só permite **anexar**
  (escanear). Sem fluxo digital bloqueante.
- ⏳ **Exportar CSV** da lista de clientes/contatos (com filtro aplicado).
