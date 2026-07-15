# Agentic Workflow — ink-ops

> Arquitetura do workflow de agentes Claude Code deste repositório. Regras de estilo em
> `docs/ai/development-style-profile.md`; protocolo operacional em
> `.claude/skills/development-workflow/SKILL.md`; agentes em `.claude/agents/`.

## Princípio

O workflow é **adaptativo**: cada tarefa aciona o **menor fluxo suficiente**. Executar
todos os agentes em toda tarefa é considerado defeito, não rigor. Cada agente recebe
apenas o contexto necessário e devolve um handoff estruturado (YAML curto) — nunca a
conversa inteira nem arquivos completos quando um resumo basta.

## Nota de arquitetura — quem coordena

No Claude Code, **subagentes não podem spawnar outros subagentes**. Portanto a
coordenação é executada pelo **thread principal**, seguindo o protocolo da skill
`development-workflow`. O agente `coordinator` existe como **classificador de
roteamento**: opcionalmente invocado para tarefas ambíguas, ele devolve um YAML com
nível, agentes e contexto mínimo por agente — e o thread principal executa esse
roteamento. Para tarefas de classificação óbvia, o thread principal classifica
diretamente pelos critérios abaixo, sem invocar o coordinator.

## Classificação de tarefas

### Simples
Alteração localizada, arquivo(s) conhecido(s), zero risco elevado.
Exemplos: corrigir mensagem de validação num DTO, corrigir import, ajustar classe
Tailwind num componente, pequena configuração.

```text
Thread principal (classifica)
  → implementer
  → validação direcionada (check-types + lint do app afetado)
  → resposta final
```

### Intermediária
Bug fix, novo endpoint simples seguindo padrão existente, nova validação em use-case,
alteração em poucos módulos com padrão existente.

```text
Thread principal (classifica)
  → locator
  → implementer
  → tester
  → resposta final
```

### Complexa
Feature transversal, mudança de arquitetura, migration, auth/autorização, contrato
público, múltiplos módulos, integração externa crítica.

```text
Thread principal (classifica; coordinator se ambíguo)
  → locator
  → planner
  → implementer            (um passo do plano por vez, quando o plano fatiar)
  → tester
  → database-guardian      (somente se tocar schema/migrations/RLS/dados persistidos)
  → reviewer
  → implementer (correções de findings critical/high)
  → tester (revalidação direcionada)
  → resposta final
```

## Critérios de elevação por risco

Uma tarefa pequena em volume é tratada como **complexa** quando toca qualquer um de:

- Banco de dados / migrations / dados persistidos (migrator custom com hash + `.down.sql`, ADR-0003)
- Multi-tenancy / RLS por organização / `DRIZZLE` vs `DRIZZLE_ADMIN` / guards de organização (ADR-0005)
- Auth / autorização / sessão (Supabase auth); `super_admin` age como owner (ADR-0013)
- Caixa / dinheiro (`_cents`, lançamentos append-only + erratas + saldo agregado, ADR-0010)
- Cron / jobs assíncronos (tick interno unificado)
- Contratos públicos da API (shape de resposta, códigos de erro em `DomainExceptionFilter.CODE_TO_STATUS`)
- Integrações externas (Resend, Better Stack, calendário)
- Feature flags / gating (ADR-0009)
- Compatibilidade retroativa com dados existentes

`database-guardian` é acionado **adicionalmente** (não em substituição ao reviewer)
quando a mudança inclui schema, migration, backfill ou troca de conexão DRIZZLE.

## Agentes e responsabilidades

| Agente | Papel único | Modelo | Escreve código? |
|---|---|---|---|
| `coordinator` | Classificar tarefa e propor roteamento (YAML) | sonnet | Não |
| `locator` | Recall RAG + localizar arquivos/testes/padrões; contexto mínimo | haiku | Não |
| `planner` | Plano executável fatiado (só tarefas complexas) | herda o principal | Não |
| `implementer` | Implementar o escopo aprovado, menor mudança possível | sonnet | **Sim (único)** |
| `tester` | Menor validação suficiente; separar regressão de falha preexistente | sonnet | Não |
| `reviewer` | Revisar diff: bugs, segurança, tenancy, estilo, validação | herda o principal | Não |
| `database-guardian` | Guardião de schema/migrations/RLS/centavos (opcional) | herda o principal | Não |

### Política de modelos

- **haiku** para busca/localização (locator) — barato e suficiente para grep+recall.
- **sonnet** para execução padrão (implementer, tester, coordinator).
- **Herança do modelo principal** (campo `model` omitido) para os papéis de maior
  exigência (planner, reviewer, database-guardian) — a spec de risco pede o modelo mais
  forte disponível apenas nessas etapas, e herdar evita fixar nomes de modelo que mudam.

## Handoffs

Cada agente devolve **apenas** o YAML definido no seu arquivo em `.claude/agents/`.
O thread principal repassa ao próximo agente somente:

1. Objetivo da etapa (1–3 frases).
2. O YAML do agente anterior (ou o passo relevante do plano, não o plano inteiro).
3. Restrições aplicáveis (regras MUST/MUST NOT pertinentes do style profile).

Nunca repassar: histórico da conversa, logs completos, documentação inteira, arquivos
não relacionados.

Cadeia de formatos (definidos nos arquivos dos agentes):

```text
coordinator → routing YAML (level, agents, per-agent context)
locator     → task_scope / entry_points / relevant_files / existing_patterns / tests / constraints / risks
planner     → objective / assumptions / constraints / steps[] / acceptance_criteria / risks
implementer → status / changes[] / tests_added_or_updated / validation_requested / deviations / handoff_to_tester
tester      → status / commands[] / regressions / pre_existing_failures / coverage_gaps / recommended_action
reviewer    → verdict / findings[] / style_compliance / test_assessment
db-guardian → verdict / findings[] / migration_assessment / rls_assessment
```

## Validação (comandos reais do projeto)

O projeto ainda **não tem suíte de testes automatizada** (`test`/`test:e2e`) configurada.
A validação padrão do tester — parar no menor conjunto que prova a mudança:

1. Typecheck direcionado: `pnpm --filter <app> check-types`
2. Lint direcionado: `pnpm --filter <app> lint` (`--max-warnings 0` — warnings quebram)
3. Typecheck amplo: `pnpm check-types` (cache Turborepo)
4. Build: `pnpm --filter <app> build` (ou `pnpm build`) — quando config/build foi afetado
5. Migrations locais: `pnpm --filter backend db:status` (+ `npx supabase status`) quando tocou schema

Quando o projeto ganhar testes (TDD por módulo é uma regra prevista no roadmap), a suíte
direcionada (`pnpm --filter backend test -- <pattern>`) vira o passo 0. Enquanto não
existe, não invente comandos de teste.

## Regras anti-desperdício

- **Limite de exploração**: locator para quando tiver entry point + fluxo + arquivos +
  testes + padrão equivalente + riscos. Não lê arquivos inteiros quando símbolos bastam.
- **Anti-loop**: duas tentativas sem progresso ⇒ o agente registra o bloqueio no seu
  YAML (`risks`/`recommended_action`) e devolve ao thread principal com a menor próxima
  ação proposta. Não repetir a mesma busca sem hipótese nova.
- **Sem narrativa**: agentes internos devolvem decisões, evidências, arquivos, riscos e
  próxima ação — não prosa longa nem raciocínio detalhado.
- **RAG primeiro**: locator (e planner quando precisa de contexto de domínio) chamam
  `memory_search` do MCP `ink-memory` antes de varrer código (regra do CLAUDE.md).

## Segurança (todos os agentes)

Proibido em qualquer fluxo: `git push`, deploy, publish, migrations em banco remoto,
alteração de secrets, `git reset --hard`, `git clean -fd`, apagar branches, commits sem
solicitação explícita, instalar dependência sem justificativa comprovada. Apenas o
`implementer` edita arquivos, e somente dentro do escopo aprovado.

## Formato da resposta final (thread principal)

```text
Implementado:
- ...
Validação:
- Typecheck: ...
- Lint: ...
- Build: ...
Arquivos alterados:
- ...
Riscos ou pendências:
- Nenhum.
```

Seções vazias são omitidas. Sem narrativa do processo — apenas o quê, como foi validado,
o que mudou e o que restou.
