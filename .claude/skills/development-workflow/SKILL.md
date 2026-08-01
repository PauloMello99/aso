---
name: development-workflow
description: Protocolo de coordenação do workflow de agentes do ink-ops. Usar em toda tarefa de desenvolvimento (feature, bug fix, refactor, migration) para classificar a tarefa, executar o menor fluxo de agentes suficiente, limitar contexto entre agentes e consolidar a resposta final padronizada. Não usar para perguntas puramente conversacionais ou de leitura trivial.
---

# Development Workflow — protocolo de coordenação (ink-ops)

Você (thread principal) é o coordenador. Subagentes não spawnam subagentes, então o
roteamento é seu. Referências: fluxos e critérios em `docs/ai/agentic-workflow.md`;
regras de estilo em `docs/ai/development-style-profile.md`; agentes em `.claude/agents/`.

## 1. Classificar

Aplique nesta ordem:

1. **Gatilhos de risco** — a tarefa toca banco/migrations, RLS/tenancy (por organização),
   auth/sessão, caixa/dinheiro (`_cents`, append-only), cron/jobs, contrato público da
   API, integração externa ou compatibilidade com dados persistidos? ⇒ **complexa**,
   mesmo se pequena.
2. Sem risco: arquivo(s) conhecido(s) e mudança localizada ⇒ **simples**.
3. Sem risco: poucos módulos, padrão existente ⇒ **intermediária**.
4. Transversal ou incerta ⇒ **complexa**.
5. Classificação genuinamente ambígua ⇒ invoque o agente `coordinator` e siga o YAML dele.

Se a tarefa for inexecutável sem uma decisão do usuário (requisito ambíguo, duas
interpretações com custos muito diferentes), pergunte ANTES de acionar agentes.

## 2. Executar o menor fluxo

Escolha o implementer pelo domínio do passo: **backend-implementer** (`apps/backend/**`,
migration, use-case, controller, tooling/root) ou **frontend-implementer** (`apps/frontend/**`,
componente, hook, schema). Full-stack ⇒ ambos, na ordem backend → frontend. Abaixo,
`<implementer>` = o do domínio.

- **Simples**: `<implementer>` → você roda `pnpm check-types` + `pnpm lint` (filtrados no
  app afetado quando possível) → resposta. **Não** acione locator/planner/tester/reviewer.
- **Intermediária**: `locator` → `<implementer>` → `tester` → resposta.
- **Complexa**: `locator` → `planner` → (aprovação do usuário se a mudança for grande ou
  destrutiva) → `<implementer>` (um passo do plano por vez) → `tester` →
  `database-guardian` (somente se o diff tiver schema/migration/backfill/conexão DRIZZLE)
  → `reviewer` → correções (implementer do domínio só com findings critical/high; tester
  revalida direcionado) → resposta.

Variantes:
- **Bug com causa não óbvia**: insira `debugger` entre locator e implementer — ele isola a
  causa-raiz e devolve um `proposed_fix` que o `<implementer>` aplica.
- **UI-heavy** (tela/fluxo novo, redesenho): insira `design` antes do `frontend-implementer` —
  ele devolve a spec de UI (layout/estados/tokens) que o implementer executa.
- **Documentação**: `codebase-documenter` é invocado explicitamente (fora destes fluxos) para
  docs de módulo/README ou auditoria de frescor; escreve só arquivos de doc.

Regra de ouro: cada agente a mais precisa se justificar. Na dúvida entre acionar ou não
um agente opcional, não acione — a menos que haja gatilho de risco.

## 3. Limitar contexto (handoffs)

Passe a cada agente somente:
- Objetivo da etapa em 1–3 frases.
- O YAML do agente anterior (ou apenas o passo relevante do plano).
- As 3–6 regras MUST/MUST NOT do style profile pertinentes àquela etapa.

Nunca passe: histórico da conversa, logs completos, o plano inteiro quando só um passo
importa, documentação inteira. Os formatos de saída de cada agente estão nos próprios
arquivos em `.claude/agents/` — exija-os; se um agente devolver prosa, extraia só o
essencial antes de repassar.

## 4. Validar

Tarefas simples: você mesmo valida (`pnpm check-types`, `pnpm lint`). Demais: o `tester`
decide a menor validação. **Realidade atual do ink-ops**: não há suíte automatizada
(`test`/`test:e2e`) configurada, então a validação padrão é `check-types` → `lint` →
`build` (direcionados por app; `build` completo e `db:status` só quando o risco pedir).
Falha do tester classificada como regressão volta ao `implementer` com apenas o trecho
essencial; falha preexistente é reportada ao usuário, não corrigida em silêncio.

## 5. Quando parar / escalar

- Convergiu (tester `passed`, reviewer `approved`/`approved_with_notes`) ⇒ responda.
- **Duas rodadas** de correção sem convergir ⇒ pare e escale ao usuário com o estado
  atual (findings abertos, falhas restantes). Não insista em loop.
- Agente bloqueado (`blocked`/`inconclusive`) ⇒ resolva com a menor ação (geralmente uma
  pergunta ao usuário ou um locator direcionado) — não relance o mesmo agente com o
  mesmo input.
- Surgiu decisão durável (convenção nova, trade-off arquitetural) ⇒ proponha registrar
  via `/adr` antes de encerrar (regra do CLAUDE.md).

## 6. Segurança (inegociável em qualquer fluxo)

Sem `git push`, deploy, publish, migrations em banco remoto, alteração de secrets,
`git reset --hard`, `git clean -fd`, exclusão de branches. Commits somente quando o
usuário pedir — e aí no padrão do autor: Conventional Commit em pt-BR sem acentos, com
escopo e referência de milestone/fatia quando aplicável, corpo explicando o porquê.

## 7. Resposta final (formato fixo, seções vazias omitidas)

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

Curta e objetiva: o que foi feito, como foi validado, o que mudou, o que restou. Sem
narrativa do processo, sem repetir as saídas dos subagentes.
