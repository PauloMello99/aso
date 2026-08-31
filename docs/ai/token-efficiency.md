# Token Efficiency — Claude Code no ink-ops

> Como reduzir consumo de tokens do Claude Code neste repositório. Complementa
> `docs/ai/agentic-workflow.md` (o "menor fluxo suficiente" já é a maior alavanca de
> economia) e `docs/ai/development-style-profile.md`.

## Onde os tokens vão (ordem de impacto)

Em coding agêntico o custo é dominado por **input** (system prompt + definições de tool +
contexto MCP + resultados de tool, sobretudo `git diff`/`grep`/build logs), não por
**output**. Qualquer plano de economia ataca input primeiro.

| Alavanca | Alvo | Ganho aproximado | Esforço |
|---|---|---|---|
| Menor fluxo de agentes suficiente (workflow adaptativo) | input+output | alto | já é regra |
| Podar `enabledMcpjsonServers` / plugins não usados | input/turno | alto | 1 linha |
| `rtk` (compressão de saída de comandos) | input (tool results) | médio neste repo (só `git`/`grep`/`find`; não pega `pnpm`/`turbo`) | instalar binário |
| Deferred tools + `ToolSearch` (schemas sob demanda) | input/turno | médio | já ativo no harness |
| `/compact` e sessões curtas e focadas | input acumulado | médio | hábito |
| `caveman` (resposta comprimida) | **output apenas** | baixo-médio | já instalado |
| Modelo/opções (`opus[1m]`, `alwaysThinkingEnabled`) | input + thinking | médio | preferência pessoal |

## 1. RTK — Rust Token Killer (compressão de saída de comandos)

**O que é.** Binário Rust (`rtk-ai/rtk`, Apache-2.0, sem telemetria/conta) que instala um
hook `PreToolUse` no Claude Code. O hook reescreve comandos de shell "barulhentos"
(`git status`, `git diff`, `grep`, `find`, `ls`, `cat`, `cargo test`, `pytest`, `jest`,
`tsc`, `docker ps`, ...) para `rtk <comando>`, que roda o comando de verdade e devolve só
o sinal — média de ~89% menos ruído em ~2.900 comandos medidos pelo autor.

**Estado neste ambiente.** Instalado e verificado (2026-08-30). `rtk 0.46.0` em
`~/.local/bin/rtk.exe`; hook `PreToolUse`/`Bash` → `rtk hook claude` em
`~/.claude/settings.json`; `~/.claude/RTK.md` (slim) + `@RTK.md` em `~/.claude/CLAUDE.md`.
Teste funcional: o hook reescreve `git status` → `rtk git status`. `rtk gain` ainda sem
dados (instalação nova).

**Instalação (Windows — referência).** É download+execução de binário de terceiro que
passa a interceptar todo comando de shell; por isso não é feito automaticamente.

PowerShell (baixar + extrair para uma pasta no PATH, ex. `~\bin`):

```powershell
$dst = "$HOME\bin"; New-Item -ItemType Directory -Force $dst | Out-Null
Invoke-WebRequest -Uri "https://github.com/rtk-ai/rtk/releases/latest/download/rtk-x86_64-pc-windows-msvc.zip" -OutFile "$env:TEMP\rtk.zip"
Expand-Archive -Path "$env:TEMP\rtk.zip" -DestinationPath $dst -Force; Remove-Item "$env:TEMP\rtk.zip"
# adicione $HOME\bin ao PATH (persistente) se ainda não estiver:
[Environment]::SetEnvironmentVariable("Path", "$env:Path;$dst", "User")
```

Depois, num shell novo, instale o hook — escopo **pessoal** (`~/.claude/settings.json`),
nunca escopo de projeto:

```bash
rtk --version        # confirma a versão instalada
rtk init -g          # grava o hook PreToolUse
rtk init -g --show   # verificar
```

**Por que `-g` (pessoal) e não escopo de projeto.** `rtk init` sem `-g` grava o hook em
`.claude/settings.json` (versionado, compartilhado). Um colega sem o binário `rtk` teria
**todo comando Bash falhando** no `PreToolUse`. Mantenha o RTK como ferramenta pessoal.

**Ressalvas para este repo:**
- O hook do RTK só atua na tool **`Bash`**. Sessões que usam outra tool de shell
  (ex.: `PowerShell` nativo) não disparam o hook.
- A lista de wrap do RTK **não inclui `pnpm`/`turbo`/`vitest`**. Os comandos mais
  barulhentos daqui (`pnpm build`, `pnpm test`, `pnpm lint`, `pnpm check-types`) passam
  intactos. O ganho real aqui vem de `git diff`/`git status`/`grep`/`find`/`rg` — que já
  é relevante, mas não o número de vitrine.
- Medir antes de promover: `rtk gain` mostra o acumulado economizado; `rtk discover`
  varre transcripts atrás de comandos barulhentos ainda não cobertos.
- Excluir comandos problemáticos em `~/.config/rtk/config.toml` (`[hooks] exclude_commands`).
- Desinstalar: `rtk init -g --uninstall`.

## 2. Caveman — modo de resposta comprimido

**O que é.** Plugin/skill (`JuliusBrussee/caveman`) que instrui o modelo a **escrever a
resposta** em estilo telegráfico ("caveman"): sem artigos, sem filler, sem hedging,
substância técnica e blocos de código intactos. Níveis: `lite` / `full` (default do plugin) /
`ultra` / `wenyan-*`.

**Estado neste ambiente.** Instalado e habilitado — engajamento por sessão ainda não
confirmado empiricamente (ver abaixo).
- `~/.claude/settings.json` → `extraKnownMarketplaces.caveman` (`github:JuliusBrussee/caveman`)
- `.claude/settings.json` → `enabledPlugins.caveman: true`
- Plugin em `~/.claude/plugins/marketplaces/caveman/`; hooks `SessionStart`
  (`caveman-activate.js`, injeta as regras) e `UserPromptSubmit` (`caveman-mode-tracker.js`).
- `.caveman.json` na raiz do repo fixa `defaultMode: "lite"` (config repo-local do plugin;
  precede a config de usuário, perde só para a env `CAVEMAN_DEFAULT_MODE`).
- Comandos: `/caveman lite|full|ultra|off`, `/caveman-stats`, `/caveman-compress`.
- Nota: os arquivos `~/.claude/.caveman-active.<pid>.<ts>` são temporários vazados de
  escrita contendida no Windows (issues #511/#578/#657 do plugin), **não** prova de sessões
  ativas. A confirmação real é rodar `/caveman-stats` numa sessão de uso normal.

**Expectativa honesta (números do próprio autor, `docs/HONEST-NUMBERS.md`):**
- Reduz **só output**. Não toca input, contexto, arquivos nem thinking.
- Headline "65% menos output" é por-resposta em respostas verbosas (1k+ tokens).
- **Total de sessão** medido independentemente: ~14–21% em workloads de output pesado.
- **Custo fixo**: ~1–1.5k tokens de input por turno (regras injetadas).
- **Net-negativo** em Q&A curto de código (resposta normal < ~1.5k tokens de output) e
  em agentes cobrados por request, não por token.
- Ganho colateral garantido: respostas mais rápidas de ler.

**Recomendação para este repo.** Manter só o plugin (não empilhar um output-style
concorrente — duplicaria o custo de ~1–1.5k/turno sem efeito extra). Default do repo já
fixado em `lite` (`.caveman.json`): mantém gramática, corta só filler/hedging — menor risco
de ambiguidade em trabalho de código. Subir para `full` por sessão (`/caveman full`) quando
a tarefa for discussão/explicação longa. Rodar `/caveman-stats` de vez em quando para
conferir o saldo real; se um A/B na página de billing do provedor não mostrar ganho,
`/caveman off` (ou `defaultMode: "off"` no `.caveman.json`).

## 3. Alavancas maiores que os dois tools acima

Não alteradas aqui — decisão do usuário —, mas registradas por terem impacto por turno
maior que o `caveman`:

- **`.claude/settings.json` → `enabledMcpjsonServers`** lista 10 servidores. Nesta sessão
  `github` e `better-stack` **falharam ao conectar** e `resend`/`shadcn` deram **timeout** —
  servidor quebrado ainda custa superfície de prompt enquanto está habilitado. Manter
  habilitados só os efetivamente usados no dia a dia (ex.: `ink-memory`, `supabase-local`,
  `postgres-local`) e habilitar os demais sob demanda reduz input todo turno.
- **`~/.claude/settings.json` → `"model": "opus[1m]"`** usa a janela de 1M (input ~2x mais
  caro). Trocar para contexto padrão quando a tarefa não precisa de 1M.
- **`"alwaysThinkingEnabled": true`** gera tokens de raciocínio todo turno. Deixar o
  thinking sob demanda em tarefas triviais.
- **Deferred tools + `ToolSearch`** já reduzem o custo de schemas de tool (carregados sob
  demanda). Preferir esse caminho a habilitar MCPs inteiros.

## TL;DR

1. `caveman`: instalado e habilitado; default do repo fixado em `lite` via `.caveman.json`.
   Confirmar engajamento e saldo real com `/caveman-stats` numa sessão de uso.
2. `rtk`: **instalado e verificado** (`0.46.0`, hook ativo). Acompanhar economia com
   `rtk gain` / `rtk discover` após alguns dias de uso.
3. Maior ganho real e de graça: podar `enabledMcpjsonServers` e manter o fluxo de agentes
   no menor suficiente.
