# Backlog da reunião de 10/07/2026 — revisão do MVP (IOS)

> Fonte: `meeting-07-10-26.md` (Parte I, 51 min) e `meeting-07-10-26-summary.md`
> (Parte II, 32 min). Participantes: Paulo (dev), Ruan (stakeholder).
> Status: **proposta de milestones — aguardando aprovacao do Paulo**.

## Contexto

Reuniao de revisao pos-testes internos do MVP. Objetivo: refinar o produto ate o fim de
julho, free trial de 2 meses (ago–set) para estudios selecionados, lancamento publico em
outubro. Nome oficial do produto: **IOS (Assessoria Inc. Operational System)**.

---

## Inventario completo de itens

### Bugs

| # | Item | Severidade | Modulos | Ref |
|---|---|---|---|---|
| B1 | **Permissoes acopladas**: funcionario nao seleciona cliente/material no lancamento de servico sem ter a flag de gerenciamento do modulo. A flag deve refletir apenas *gerenciar* a entidade; selecao dentro de servico e outra permissao. | **Critica** | auth/permissions, services, customers, materials | Part II 7:16–11:52 |
| B2 | Servico sem material vinculado **falha silenciosamente** (nao salva e nao mostra erro no formulario). | Alta | services (frontend form) | Part I 45:32 |
| B3 | Agenda **nao navega para meses futuros**. | Media | calendar | Part I 31:04 |
| B4 | Telefone aceita qualquer coisa (ex.: 9999999...). Falta validacao de plausibilidade com country code. | Media | customers | Part I 2:41 |
| B5 | Cliente duplicado por **e-mail** e permitido (com "deseja prosseguir?"). Deve bloquear sem opcao de prosseguir; nome pode repetir. | Media | customers | Part I 14:21 |
| B6 | E possivel **lancar servico com data futura**. Bloquear. | Media | services | Part I 44:52 |
| B7 | Metodo de pagamento **"Creditos"** aparece no lancamento — sobra de codigo do cashback descartado. Remover. | Baixa | cashier | Part II 2:54 |

### Alteracoes / restricoes (comportamento existente)

| # | Item | Modulos | Ref |
|---|---|---|---|
| A1 | **Transferencia**: remover metodos de pagamento (Pix, cartao etc.); so caixa de origem → caixa de destino. | cashier | Part II 1:11–2:49 |
| A2 | **Ocultar do funcionario** valores de custo/reposicao de estoque no dashboard (e qualquer metrica de valor restrita a admin). | overview, materials | Part I 34:49; Part II 7:16 |
| A3 | Remover opcao **"Excluir conta" para funcionarios**. Para admins: pesquisar LGPD antes de decidir (anonimizacao vs exclusao; efeito cascata em assinatura/organizacao). | auth, settings | Part II 4:44–6:44 |
| A4 | Tornar **material obrigatorio** no lancamento de servico, com mensagem de erro clara (par do B2). | services | Part I 45:59 |
| A5 | **Exportacao**: renomear "CSV" para "Exportar dados" com opcoes CSV (delimitador configuravel) ou Excel (.xlsx). | todas as listagens com export | Part I 16:01–24:56 |
| A6 | Campos obrigatorios no cadastro de cliente: **e-mail, endereco, data de nascimento**. | customers | Part I 4:24–7:20 |

### Novas features

| # | Item | Tamanho | Modulos | Ref |
|---|---|---|---|---|
| F1 | **ViaCEP** no endereco: CEP puxa endereco; separar numero do logradouro; fallback aberto para nao-BR. | M | customers | Part I 5:00–6:40 |
| F2 | **Filtros de cliente**: aniversariantes do mes (range de data de nascimento) + cidade/estado. Decisao: melhorar o filtro, NAO criar aba propria. | M | customers | Part I 25:13–28:12 |
| F3 | **Pagina de detalhe do cliente** (double-click na lista): historico de transacoes, servicos, cadastro. Feature existia no roadmap V1 e foi cortada; restaurar. | M | customers | Part I 15:14–16:01 |
| F4 | **Flag 18+ por tipo de servico**: tatuagem exige revisao de menoridade no lancamento (alerta/bloqueio se cliente <18 na data); body piercing permite. | M | services | Part I 9:36–11:46 |
| F5 | **Categorias de saida do caixa gerenciaveis**: seed padrao na criacao da org (Conta, Funcionario, Material, Reforma, Servico, Transferencia, Outros); admin cria novas (ex.: Estorno); "Outros" fixo. | M | cashier | Part I 48:28; Part II 0:13–4:44 |
| F6 | **Eventos de agenda compartilhados**: evento visivel para toda a org + lista de presenca (funcionario marca "vou/nao vou"). Evento pessoal continua privado (funcionario ve so o seu; admin ve todos). Valor da sessao: fica na descricao (sem campo novo). | M | calendar | Part I 28:12–32:20 |
| F7 | **Upload de arquivos (revisao)**: permitir renomear pelo sistema; nome interno unico no storage; preservar nome amigavel no download. Caso de uso: multiplos anexos por cliente (anamnese + emancipacao). | M | customers/storage | Part I 11:57–14:18 |
| F8 | **Fotos no servico**: ate 3 imagens, max 300KB cada (limite rigido para custo de storage). | M | services/storage | Part I 46:19–48:18 |
| F9 | **Tour de onboarding**: auto-exibir no primeiro login; replay em Configuracoes. Substitui manual de usuario estatico. | M/G | frontend (transversal) | Part II 11:52–14:00 |
| F10 | **Construtor de ficha de anamnese**: perguntas texto e sim/nao; ficha por tipo de servico; **versionamento** (servico referencia a versao usada); **assinatura digital**; envio de link publico (preenchimento sem login) via e-mail/WhatsApp. | **G** | novo modulo | Part I 36:29–44:49 |
| F11 | **Trial links + assinatura basica**: link de trial de 2 meses, assinatura com desconto para pilotos, integracao de pagamento. | **G** | novo modulo (billing) | Part II 21:32–25:24 |

### Alinhamentos / decisoes de produto (documentar, sem codigo)

| # | Decisao | Ref |
|---|---|---|
| D1 | **Nicho**: foco em estudios de tatuagem, tatuadores e body piercers. Nao generalizar para barbearias etc. | Part I 7:20–9:36 |
| D2 | **Nome**: IOS — Assessoria Inc. Operational System. Logo vetorizado + paleta chegam do Ruan/Joao Pedro (prometido ate 14/07). | Part II 14:29–17:42 |
| D3 | **Cashback/creditos**: descartado do core; se voltar, sera via feature flag por organizacao (super admin habilita). | Part I 18:30 |
| D4 | Configuracoes permanecem centralizadas na aba Configuracoes (nao mover para dentro dos modulos) — facilita treinamento. | Part I 34:21–34:49 |
| D5 | Multi-organizacao guest (dono de um estudio como funcionario de outro) e cenario suportado e desejado. | Part II 8:40–9:45 |
| D6 | Cronograma GTM: julho = refinamento + pagamento; ago–set = free trial (3 estudios ja confirmados); out = lancamento publico. | Part II 21:32–25:59 |

### Visao de futuro (fora de escopo agora — so registrar)

- **Perfil Distribuidor**: plataforma propria para distribuidora parceira (parcerias,
  descontos, quem comprou). Horizonte ~2 meses; reuniao dedicada com o distribuidor antes.
- **Super Admin central**: evoluir admin atual para painel unico de todos os produtos da
  Assessoria Inc. (IOS, audiovisual etc.).
- **Agenda do audiovisual**: provavelmente outro produto; conversa futura.
- **Mensagens pos-atendimento / remarketing**: campanhas de disparo; conversa futura.
- **Dominio e e-mail do IOS**: tarefa de infra (Paulo), depende do branding.

---

## Proposta de milestones

Ordenados do menor/mais urgente para o maior. Cada milestone = uma branch
`features/<slug>` (ou `fix/<slug>`), PR para `development`, bump de versao e testes.

| Milestone | Conteudo | Risco (skill) |
|---|---|---|
| **M0 — Infra de testes** | Configurar runner de testes (backend + frontend), task `test` no turbo.json, primeiros testes nos utils/use-cases existentes. Pre-requisito para "testes em toda etapa". | intermediaria |
| **M1 — Fix critico de permissoes** (B1) | Desacoplar flag de gerenciamento de modulo da selecao de entidades dentro do lancamento de servico. | **complexa** (auth/RLS) |
| **M2 — Restricoes e validacoes rapidas** (B2, B4, B5, B6, B7, A1, A4) | Validacao de telefone, e-mail unico por org, bloqueio de data futura, material obrigatorio + erro no form, transferencia simplificada, remover "Creditos". | complexa (toca caixa e unique constraint) |
| **M3 — Visibilidade por papel** (A2, A3-parte-funcionario) | Ocultar metricas de valor do funcionario no dashboard/estoque; remover "Excluir conta" de funcionario. LGPD para admin fica pendente de pesquisa. | intermediaria |
| **M4 — Cadastro de cliente** (A6, F1, F2, F3) | Obrigatoriedade de campos, ViaCEP + numero separado, filtros (aniversariantes, cidade/estado), pagina de detalhe do cliente. | complexa (migration em customers) |
| **M5 — Caixa: categorias gerenciaveis** (F5) | CRUD de categorias por org + seed padrao + migracao de dados existentes. | **complexa** (caixa/dinheiro, migration) |
| **M6 — Agenda** (B3, F6) | Navegacao futura, eventos compartilhados + presenca. | intermediaria |
| **M7 — Servicos: regras e midia** (F4, F8, F7) | Flag 18+ por tipo de servico, upload de fotos do servico, revisao do upload de arquivos. | complexa (migration + storage) |
| **M8 — Exportacao de dados** (A5) | "Exportar dados": CSV com delimitador + Excel. | intermediaria |
| **M9 — Onboarding tour** (F9) | Tour interativo, primeira entrada + replay em config. | intermediaria (so frontend) |
| **M10 — Ficha de anamnese** (F10) | Form builder versionado + assinatura + link publico. | **complexa** (novo modulo, contrato publico) |
| **M11 — Trial + assinatura** (F11) | Billing/pagamentos, links de trial. | **complexa** (dinheiro, integracao externa) |

### Versionamento proposto

Apps estao em `0.1.0`, sem tags. Proposta: semver com tag por milestone concluido
(`v0.2.0` apos M1, e assim por diante; M2+ incrementa minor; correcoes pontuais, patch).
Tag criada localmente junto do merge do PR — push somente pelo Paulo.

## Decisoes tomadas (Paulo, 15/07/2026)

1. **Testes**: espelhar o Larmony — **Jest no backend** (ts-jest, specs em
   `src/**/*.spec.ts`) e **Vitest no frontend** (Larmony nao tem testes de frontend,
   entao assumimos Vitest conforme combinado).
2. **Campos obrigatorios do cliente**: fixos para todas as organizacoes.
3. **Anamnese**: envio de link por e-mail (Resend) + botao "copiar link". Sem
   integracao WhatsApp no MVP.
4. **Billing (M11)**: provedor e **Stripe**, baseado na implementacao existente no
   Larmony. Tudo gerenciado no Stripe e espelhado no sistema: trials, descontos e
   isencoes (= cupom de 100%) vem do Stripe; assinatura sempre criada no Stripe.
   Executado por ultimo, apos M0–M10.

## Pendencias

- LGPD (A3-admin): pesquisa de conformidade para exclusao/anonimizacao de conta de
  admin — bloqueia apenas a parte de admin do M3 (a remocao para funcionario segue).
- Logo vetorizado + paleta do IOS (Ruan/Joao Pedro) — bloqueia rebranding, nao bloqueia
  nenhum milestone tecnico.
