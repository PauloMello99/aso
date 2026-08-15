# ADR-0020: Anamnese como módulo de topo, gate de versão obrigatória e auto-vínculo

**Data**: 2026-08-04
**Status**: Aceito

## Contexto

A feature de anamnese já existia (M10a/b/c + ADR-0018): form builder versionado, envio de
convite por link público, resposta com assinatura + PDF. Vivia inteiramente dentro de
`settings/anamnesis` (owner-only) e o vínculo serviço↔resposta (`assertAnamnesisResponseLinkable`)
validava apenas `customerId`/`serviceTypeId`, sem checar se a resposta vinculada era da
versão vigente do formulário. O usuário pediu evolução em 4 pontos: (1) maior destaque —
item de sidebar de topo, não só em configurações; (2) obrigatoriedade de repreenchimento
quando uma nova versão do formulário é publicada, preservando a validade da resposta antiga
para serviços já vinculados; (3) histórico de versões visível para owner/super-admin; (4)
ficha respondida (respostas + assinatura) acessível tanto no detalhe do cliente quanto no
do serviço, com botão de enviar/reenviar quando desatualizada.

## Decisão

### 1. Gate de versão em runtime, sem migration

`assertAnamnesisResponseLinkable` ganhou `formRepo` + `skipVersionCheck`. Comparação é por
`formVersionId` (nunca `versionNumber`) contra `formRepo.getCurrentVersion(serviceTypeId, orgId)`.
Não bloqueia quando `current` é `null` (form nunca configurado) ou `response.formVersionId`
é `null` (`ON DELETE SET NULL`). `create-service` sempre passa `skipVersionCheck=false`;
`update-service` calcula `effectiveAnamnesisResponseId = input.anamnesisResponseId !== undefined
? input.anamnesisResponseId : service.anamnesisResponseId` e só pula a checagem de versão
quando esse valor é igual ao já vinculado — ou seja, editar um serviço sem tocar no vínculo
nunca quebra mesmo com o form em V2, mas qualquer vínculo novo (inclusive via troca de
cliente/tipo sem reenviar o campo) sempre revalida. Essa revalidação incondicional foi
adicionada depois de um finding do database-guardian: sem ela, trocar só o `customerId`
deixava a ficha do cliente antigo vinculada ao serviço do novo (vazamento de dado de saúde
entre titulares).

### 2. Auto-vínculo no frontend em vez de seletor manual

`service-form.tsx` não ganhou um combobox de "escolher ficha" — o invariante de negócio
(`findLinkable` filtra `status=submitted` + não vinculada a nenhum serviço + versão vigente)
garante no máximo uma resposta elegível por par (cliente, tipo). `useAnamnesisPromptState`
expõe `linkableResponseId`; um `useEffect` em `service-form.tsx` chama
`form.setValue("anamnesisResponseId", linkableResponseId)` só quando há uma resposta nova
elegível, nunca zera o campo proativamente. Isso é seguro porque uma resposta já vinculada
ao próprio serviço sendo editado nunca aparece em `findLinkable` (o `notExists` a exclui) —
silêncio ali preserva o vínculo existente. **Se esse invariante mudar** (ex.: permitir várias
respostas simultâneas por par), este mecanismo de auto-anexo deixa de ser seguro e precisa
virar um seletor explícito.

### 3. Sidebar promovido sem tocar `MODULE_KEYS`

Novo item em `ORG_NAV_SECTIONS` com `module: "services"` e sem `roles` (member-level).
`settings/anamnesis` (form builder, owner-only) continua existindo intacto. O guard
client-side de rota em `org-layout.tsx` foi trocado de `isModuleKey(seg) && !canAccessModule(...)`
para `getModuleForPath(subpath)` (nova função em `nav.ts` que resolve o módulo a partir do
`href` cadastrado em `ORG_NAV_SECTIONS`) — o guard antigo só cobria segmentos que já
fossem `MODULE_KEYS`, então uma rota nova com `module` próprio (como `anamnesis`) escapava
do bloqueio por URL direta para quem não tem a permissão `services`.

### 4. Leitura de respostas: DTOs explícitos, nunca a entidade crua

`ListLinkableAnamnesisResponsesUseCase`, `ListAnamnesisResponsesUseCase` e
`GetAnamnesisResponseDetailUseCase` nunca devolvem `AnamnesisResponseEntity` diretamente —
a entidade carrega `token` (segredo do link público) e `answers` completas. Todo endpoint
novo mapeia para um DTO explícito. Signed URLs de PDF/assinatura são geradas sob demanda
(TTL 300s), `storagePath` cru nunca é serializado. `displayStatus` (que trata expiração) é
usado em vez do `status` cru do banco, espelhando o padrão já existente em
`get-anamnesis-response-by-token.use-case.ts`.

## Verificação de integração

Além dos testes unitários (288 backend + 160 frontend), a feature foi validada
ponta-a-ponta contra Supabase local real (`npx supabase start`, migrator custom
`pnpm --filter backend db:migrate`) + backend/frontend reais via `preview_start`, com
`NOTIFICATIONS_EMAIL_ENABLED=false` (envio de e-mail vira no-op local, sem risco de
disparo real) e assinatura `custom`/`active` inserida direto via SQL (não há endpoint
self-service de trial). Confirmado via HTTP + browser: gate de versão bloqueando vínculo
novo (`422 ANAMNESIS_RESPONSE_OUTDATED`) mas nunca a edição de um vínculo já existente;
bloqueio do vazamento cross-cliente corrigido pelo reviewer (`422
ANAMNESIS_RESPONSE_NOT_LINKABLE` ao trocar `customerId` sem reenviar
`anamnesisResponseId`); endpoint `/linkable` sem token/answers; PDF+assinatura reais
gerados e servidos via signed URL; sidebar, histórico de versões e os dois viewers
(cliente e serviço, inclusive Sheet aninhado) renderizando corretamente.

Esse teste ponta-a-ponta pegou um bug que nenhuma camada anterior (unitários, reviewer,
database-guardian) tinha visto: `AnamnesisVersionHistory` renderizava um `<Button>`
(shadcn) dentro do `<button>` clicável do item de versão — HTML inválido
(`<button>` não pode conter `<button>`), gerando erro de hidratação React. Corrigido
trocando o `Button` decorativo (`pointer-events-none`, `tabIndex={-1}`) por um `<span>`
com o mesmo visual. **Gotcha para próximas features com item clicável + ícone decorativo
dentro**: nunca usar o componente `Button`/`button` para o ícone quando o container já é
um elemento clicável — usar `span`/`div` com `aria-hidden`.

## Consequências

- Requisito de obrigatoriedade (item 2 do pedido original) só é **exercitado de fato**
  porque o auto-anexo popula `anamnesisResponseId` — sem essa camada de frontend, o gate
  de versão no backend é código morto (nenhum caminho da UI enviava o campo antes desta
  ADR).
- Débito conhecido, não bloqueante: filtro de status "expired" na listagem ainda não é
  suportado no backend (`ListAnamnesisResponsesFilters.status` só aceita `pending`/`submitted`
  do banco), e o botão de enviar/reenviar não invalida as queries de listagem/linkable após
  o envio — refetch natural cobre isso, mas há uma janela de dado desatualizado.
- Não criar um segundo mecanismo de vínculo manual sem revisar o invariante de unicidade em
  `findLinkable` — os dois são acoplados por design (seção 2).

## Addendum (2026-08-05): consolidação em `/anamnesis` e drag-and-drop

Revisão do usuário após uso real: a ADR original (seção 3) manteve `settings/anamnesis`
como form builder owner-only e promoveu `/anamnesis` só para a LISTAGEM de fichas
respondidas. Isso se mostrou errado na prática — gerenciamento de anamnese ficou
espalhado em duas telas. Novo desenho, substituindo a seção 3 acima:

- **`settings/anamnesis` foi REMOVIDA** (rota, componente `ServiceTypesSettingsPage`,
  entrada em `SETTINGS_NAV`). Não há mais nenhuma superfície de anamnese em Configurações.
- **`/anamnesis` agora é a tela de gerenciamento de FORMULÁRIOS por tipo de serviço**
  (`AnamnesisFormsPage`): seletor de tipo (lista lateral em desktop, `Select` em mobile) +
  `AnamnesisFormBuilder` (edição, só owner) + `AnamnesisVersionHistory` (histórico, todos
  os papéis com módulo `services`). `ORG_NAV_SECTIONS`/`MODULE_KEYS` não mudaram — só o
  conteúdo que a rota renderiza.
- **A listagem de fichas RESPONDIDAS deixou de existir como página própria**
  (`AnamnesisResponsesPage` removida). Fichas respondidas só são visíveis via
  `AnamnesisResponseViewer`, embutido no detalhe do cliente e no detalhe do serviço — não
  há mais uma tela org-wide de "todas as respostas".
- **Reordenação de perguntas virou drag-and-drop** (`@dnd-kit/core` + `@dnd-kit/sortable` +
  `@dnd-kit/utilities`, únicas libs de DnD do monorepo). Padrão a repetir em outras listas
  reordenáveis: handle de arraste dedicado (`GripVertical` com `setActivatorNodeRef` +
  `{...attributes} {...listeners}`) — nunca no card inteiro, para não capturar scroll em
  touch nem roubar clique de outros controles do item; sensores com
  `PointerSensor` + `KeyboardSensor`/`sortableKeyboardCoordinates` (acessibilidade por
  teclado é obrigatória, não opcional); `onDragEnd` chama `move()` do `useFieldArray` do
  react-hook-form, nunca um `arrayMove` isolado (perderia o registro dos campos e os
  valores digitados). Área de reordenação demarcada com `border border-dashed`.
- Nenhuma mudança de backend: `create-or-update-anamnesis-form.use-case.ts` já cria nova
  versão em todo save, então reordenar + salvar já gera nova versão automaticamente — não
  existe (nem foi necessário criar) lógica de diff no frontend.
- `ServiceTypeDialog` continua compartilhado com `service-form.tsx`; `EditServiceTypeDialog`
  migrou de `ServiceTypesSettingsPage` (deletado) para `AnamnesisFormsPage` — nenhum dos
  dois ficou órfão.
