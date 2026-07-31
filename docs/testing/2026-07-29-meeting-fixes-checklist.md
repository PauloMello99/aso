# Checklist manual — correções da reunião de 29/07/2026

> Roteiro pra validar, na UI (nao API), tudo que foi corrigido/implementado no ciclo
> `docs/planning/2026-07-29-meeting-backlog.md` (N-A a N-K) antes de liberar novo round de
> teste pros stakeholders. Marque cada linha ao confirmar. Onde o comportamento esperado
> diverge do que foi pedido na reuniao, a coluna "Nota" explica o porque (decisao tomada
> durante a implementacao, geralmente confirmada com voce).

## Setup (uma vez)

- [x] Deploy em ambiente estavel (staging com dominio pago, nao mais o trial expirado que
  caiu durante a propria reuniao de 29/07 — reproduzir bug em ambiente instavel invalida
  o teste).
- [x] 3 contas na mesma org: **Owner**, **Funcionario A** (permissoes: `services`, `schedule`),
  **Funcionario B** (permissao: `stock` apenas). Servem pra N-E.
- [x] Pelo menos 1 tipo de servico com material vinculado e estoque baixo (< minimo), pra
  testar N7/N-E juntos.
- [ ] Pelo menos 1 servico ja PAGO existente (pra testar N-F).

---

## N-A — Ficha de anamnese + evento coletivo (causa raiz: corpo vazio em respostas 2xx)

| # | Passo | Esperado | ✓ |
|---|---|---|---|
| 1 | Configuracoes → Anamnese → selecionar um tipo de servico que AINDA NAO tem ficha | Aparece estado vazio "Nenhuma pergunta ainda" + botao "Adicionar pergunta" — **sem** mensagem de erro | ✓ |
| 2 | Clicar "Adicionar pergunta", criar 1-2 perguntas, salvar | Salva sem erro, perguntas aparecem na lista | ✓ |
| 3 | Agenda → criar evento coletivo → confirmar presenca como funcionario | Presenca registra **imediatamente** (sem precisar sair e entrar de novo), sem toast de erro `Unexpected end of JSON input` | ✓ |

## N-B — Formulario de novo servico

| # | Passo | Esperado | ✓ |
|---|---|---|---|
| 4 | Servicos → Novo servico → tentar salvar sem escolher Tipo | Bloqueado, "Selecione o tipo de servico" — campo tem asterisco | ✓ |
| 5 | No mesmo form, tentar digitar `1.5` ou `1,5` na quantidade de um material | Bloqueado com mensagem pt-BR "Informe uma quantidade inteira" — nao aceita decimal | ✓ |
| 6 | Reparar na largura do sheet do formulario | Visivelmente mais largo que antes (desktop), continua ocupando a tela toda no mobile | ✓ |
| 7 | Forcar estoque insuficiente (lancar servico com mais material do que tem em estoque) | Mensagem em **pt-BR** citando o **nome do material** (nao um UUID), e a linha daquele material fica destacada em vermelho no formulario | ✓ |

## N-C — Agenda: mes futuro

| # | Passo | Esperado | ✓ |
|---|---|---|---|
| 8 | Agenda → Novo evento → abrir o campo de data | Da pra navegar pra frente ate ~2 anos no futuro (nao trava no mes atual) | ✓ |
| 9 | Criar evento em um mes futuro (ex.: mes que vem) | Salva normalmente, aparece na agenda ao navegar pra aquele mes | ✓ |
| 10 | Conferir que o lancamento de SERVICO continua bloqueando data futura (regra proposital, nao relacionada a agenda) | Tentar lancar servico com data de execucao futura continua **bloqueado** | ✓ |

## N-E — Overview por permissao (funcionario)

| # | Passo | Esperado | ✓ |
|---|---|---|---|
| 11 | Logar como **Funcionario A** (`services`+`schedule`) → Overview | Ve cards de Servicos recentes e Proximos eventos. **NAO** ve Estoque baixo, Transacoes, Saldo, Clientes recentes | ✓ |
| 12 | Logar como **Funcionario B** (`stock` apenas) → Overview | Ve **so** o card "Estoque baixo", com o valor de reposicao visivel (ele tem acesso ao modulo, entao ve tudo do modulo — inclusive dinheiro) | ✓ |
| 13 | Criar um 3º funcionario **sem nenhuma permissao** → Overview | Mensagem "Nenhum modulo liberado para voce. Fale com o administrador" — sem grid vazio estranho | ✓ |
| 14 | Logar como **Owner** → Overview | Continua vendo tudo, exatamente como antes (6 cards + performance) | ✓ |

## N-F — Corrigir pagamento de servico pelo Caixa

| # | Passo | Esperado | ✓ |
|---|---|---|---|
| 15 | Caixa → localizar a transacao de um servico ja pago (tem badge "Servico" na linha) | Badge visivel, "Estornar" aparece **desabilitado** com legenda "Estorno pelo servico" | ✓ |
| 16 | Clicar "Corrigir (errata)" nessa transacao | Abre o MESMO formulario de correcao de pagamento (valor/metodo/data), nao o formulario generico de errata do caixa | ✓ |
| 17 | Corrigir o valor (ex.: de R$400 pra R$450) | Salva; **sem sair da tela de Caixa**, o saldo total atualiza pelo delta exato (+R$50), a transacao original aparece "Estornada" e uma nova aparece com o valor correto | ✓ |
| 18 | Ir na aba Servicos, achar o mesmo servico | Mostra R$450, sem precisar dar refresh manual | ✓ |
| 19 | Repetir o teste ao contrario: corrigir pela aba SERVICOS | Caixa reflete a mudanca tambem sem refresh manual | ✓ |
| **⚠** | **Nota conhecida**: o campo de data pre-preenchido no formulario pode vir diferente conforme voce entra pelo Caixa (data do pagamento) ou por Servicos (data de execucao do atendimento) — sao a mesma coisa na maioria dos casos, mas se o servico foi executado num dia e pago noutro, revise a data antes de salvar. Nao e bug, e limitacao conhecida documentada no backlog. | | ✓ |

## N-G — Estorno como categoria fixa + rotulo de transferencia

| # | Passo | Esperado | ✓ |
|---|---|---|---|
| 20 | Caixa → estornar qualquer transacao comum (nao vinculada a servico) | A transacao de estorno gerada aparece com a categoria **"Estorno"** | ✓ |
| 21 | Caixa → filtro por categoria → selecionar "Estorno" | Lista só as transacoes de estorno criadas apos o deploy (estornos antigos, de antes desta correcao, nao aparecem — esperado, nao e bug) | ✓ |
| 22 | Configuracoes → Caixa → secao "Categorias de lancamento" → tentar EXCLUIR "Estorno" | Bloqueado (categoria protegida); CRUD inteiro reescrito (Sheet, nao Dialog; sem edicao inline) — retestar item inteiro, ver secao "Retestar (rodada 2)" abaixo | ☐ |
| 23 | Tentar RENOMEAR "Estorno" pra outro nome (ex.: "Devolucao") e depois fazer um novo estorno | Permite renomear; o novo estorno continua caindo na MESMA categoria renomeada (prova que a identificacao e interna, nao pelo nome) — desfazer o rename apos o teste | ✓ |
| 24 | Caixa → Transferencia → abrir o dialog | Os dois lados mostram **"Dinheiro Fisico"** e **"Banco Digital"**, nao mais "Transferencia / Pix" | ✓ |
| 25 | Conferir que o extrato, formulario de nova transacao, taxas e historico do cliente **continuam** com os rotulos antigos ("Dinheiro", "Transferencia / Pix") | So o dialog de transferencia mudou, o resto da UI de caixa esta igual | ✓ |

## N-H — Exportacao

| # | Passo | Esperado | ✓ |
|---|---|---|---|
| 26 | Qualquer tela com botao "Exportar" → abrir o menu | So aparece "Formato" (CSV / Excel) — **sem** campo de Delimitador nenhum (removido, nao so escondido); CSV sempre virgula, XLSX nao tem delimitador (binario) | ☐ |

## N-I — Acesso ao detalhe do cliente

| # | Passo | Esperado | ✓ |
|---|---|---|---|
| 27 | Clientes (desktop) → clicar **uma vez** no nome do cliente na tabela | Abre o detalhe do cliente (nao precisa mais de double-click) | ✓ |
| 28 | Clientes (desktop) → menu de acoes (⋮) → "Ver detalhes" | Tambem abre o detalhe (forma alternativa) | ✓ |
| 29 | Clientes (mobile, tela estreita) → tocar no card do cliente | Abre o detalhe com toque simples (ja funcionava, so confirmar que continua) | ✓ |

## N-J-1 — Toggle 18+ no tipo de servico

| # | Passo | Esperado | ✓ |
|---|---|---|---|
| 30 | Configuracoes → Servicos → criar ou editar um tipo (ex.: "Tatuagem") | Aparece um switch **"Requer maior de 18 anos"** no formulario, com texto de ajuda | ✓ |
| 31 | Ligar o switch e salvar | Tipo passa a mostrar indicador "(18+)" / badge de aviso na lista/select de tipos | ✓ |
| 32 | Tentar lancar servico DESSE tipo pra um cliente cadastrado como menor de 18 | Bloqueado com mensagem de verificacao de idade | ✓ |
| 33 | Tentar lancar o mesmo servico pra um cliente maior de 18 | Permite normalmente | ✓ |
| 34 | Criar um cliente com data de nascimento de HOJE menos exatamente 18 anos | Lancamento permitido (o calculo e por dia exato, nao so ano) | ✓ |

## N-J-2 — Renomear anexo do cliente

| # | Passo | Esperado | ✓ |
|---|---|---|---|
| 35 | Ficha do cliente → Anexos → subir um arquivo | Abre dialog de nome ANTES do upload (preview do arquivo + nome-base editavel); depois de confirmar, arquivo aparece na lista com thumbnail (imagem) ou icone (PDF) | ☐ |
| 35b | Clicar no anexo (imagem ou PDF) na lista | Abre preview (imagem inline / PDF em iframe), com fullscreen e "Abrir em nova aba" (PDF) | ☐ |
| 35c | Ficha do cliente → tela de DETALHES (nao o form) | Secao "Anexos" aparece la tambem, com upload/preview/renomear/excluir funcionando | ☐ |
| 35d | Detalhes do cliente → historico de servicos → clicar num servico | Abre sheet SOMENTE LEITURA com materiais, valor/pagamento e fotos (fullscreen/download); footer so "Fechar" | ☐ |
| 36 | Clicar no icone de lapis ao lado do anexo | Abre dialog editando SO o nome-base; extensao aparece fixa, nao-editavel, ao lado | ☐ |
| 37 | Mudar o nome e salvar | Lista atualiza com o novo nome (pode levar um instante — e refetch, nao atualizacao instantanea) | ☐ |
| 38 | Tentar salvar com o campo vazio/só espaco | Botao Salvar fica desabilitado | ☐ |
| 39 | Baixar o arquivo apos renomear | O nome do arquivo baixado reflete o NOVO nome, com a extensao ORIGINAL preservada (impossivel apagar — o campo so edita o nome-base) | ☐ |
| 39b | Excluir um anexo | Pede confirmacao (ConfirmDialog) antes de excluir — nao exclui direto como antes | ☐ |

## N-K — Observabilidade (nao ha o que testar na UI)

Item tecnico — erros de contrato do cliente HTTP (resposta 2xx mal-formada) agora aparecem
no Better Stack. So verificavel olhando o painel de telemetria apos os testes acima; nao
tem passo de UI.

---

## Retestar (rodada 2) — correcoes pos-QA do checklist acima

> Estes 6 itens tinham problema real quando testados. Corrigidos; veja
> `docs/planning/2026-07-29-meeting-backlog.md` e o plano de implementacao pra detalhes.
> Marcados acima como ☐ nas linhas correspondentes; use esta secao pra saber exatamente
> o que verificar de novo.

- [ ] **#22 — Categorias de caixa**: CRUD inteiro migrou pra Configuracoes → Caixa (segunda
  secao, ao lado de Taxas de cartao). Tela de Caixa mantem so um LINK "Categorias" que
  navega pra la (nao abre mais nada inline). Sheet (nao Dialog) pra criar/editar, sem
  edicao inline na lista. Badges: "Sistema" (so a categoria Estorno) vs "Protegida" (as 7
  categorias seed comuns) vs nenhum badge (categoria criada por voce). Exclusao pede
  confirmacao.
- [ ] **#26 — Exportacao**: seletor de Delimitador removido de vez (nao so escondido). CSV
  sempre virgula; XLSX (Excel) nao tem delimitador — e formato binario, abre certo sem
  configuracao nenhuma.
- [ ] **#32 — Alert de bloqueio 18+**: ao selecionar um tipo de servico marcado como 18+ e
  um cliente menor de idade, aparece um aviso ANTES de tentar salvar (nao so depois do
  erro). Texto deixa claro que e um impedimento do estabelecimento, nao so um erro tecnico.
  Cliente sem data de nascimento cadastrada mostra aviso diferente (pra completar o
  cadastro). O botao de salvar continua clicavel — se voce insistir, o mesmo aviso aparece
  como erro final.
- [ ] **#35 — Visualizar anexos**: agora da pra abrir imagem e PDF direto na tela (sem
  baixar), com opcao de tela cheia. Anexos do cliente aparecem tanto no formulario de
  edicao quanto na tela de DETALHES do cliente. Na tela de detalhes, clicar num servico do
  historico abre um resumo somente-leitura (materiais, valor, fotos) sem poder editar nada.
- [ ] **#36 — Nome antes do upload**: ao selecionar um arquivo pra anexar, abre uma tela
  pra escolher o nome ANTES de enviar (nao depois).
- [ ] **#39 — Extensao do arquivo**: ao renomear um anexo, so da pra editar o nome — a
  extensao (`.pdf`, `.jpg`, etc.) fica fixa ao lado, impossivel apagar por engano.
  Baixar depois de renomear sempre traz o arquivo certo, abrindo normalmente.

## Pendencias que NAO fazem parte deste ciclo (nao testar, nao reportar como bug)

- **N5** (agenda em mes futuro) e **N4** eram o MESMO item — ja coberto em N-C acima, nao
  sao dois bugs separados.
- Servico com data de execucao futura continua **bloqueado de proposito** (regra do M2,
  item 10 acima confirma que isso nao mudou).
- CNPJ preenchido em `LEGAL_ENTITY` e de pessoa fisica (Joao Pedro) — a reuniao mencionou
  "CNPJ da Ink House". Confirmar qual e a entidade correta ANTES de configurar o Stripe em
  producao (pendencia de decisao de negocio, nao tecnica).
- Reversoes/estornos criados ANTES desta correcao (N-G) nao tem categoria retroativa —
  esperado, caixa e append-only, nao ha como corrigir dado historico.
