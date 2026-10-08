# Viabilidade — Documentos da organização e Formulário de orçamento (2026-10-02)

> Origem: conversa no grupo (João Perim e Ruan Azevedo), com prints, 1 vídeo de exemplo
> (Google Forms de um tatuador, aberto pelo Instagram) e 4 áudios do João (transcritos).
> Status: **análise**, nada foi implementado nem decidido. As decisões marcadas como
> "em aberto" são do produto.
>
> Legenda das afirmações: **[obs]** = verificado no código/repo · **[inf]** = inferência ·
> **[sup]** = suposição ainda não verificada.

## Resumo

| | Ideia 1 — Documentos da org | Ideia 2 — Formulário de orçamento |
|---|---|---|
| Faz sentido? | Sim, **se** tiver controle de validade. Sem isso é só uma pasta, e o Drive já faz isso | **Sim, muito.** Ataca uma dor real (orçamento espalhado entre Forms, DM e WhatsApp) e é porta de entrada de cliente novo |
| Valor percebido | Médio (baixo sem validade/alerta) | Alto (diferencial comercial, gera dado de funil) |
| Esforço | **Baixo**: ~1–2 dias (MVP), ~2–3 dias com validade [inf] | **Médio/alto**: ~5–8 dias (MVP) [inf] |
| Risco técnico | Baixo (reaproveita anexos de cliente, com policy nova só para owner) | Médio: superfície pública permanente, upload anônimo, LGPD |
| Risco de dados | **Alto** (contratos com dados pessoais e salário) | Médio (dados pessoais de quem ainda não é cliente) |
| Recomendação | Fazer, de preferência já com validade e lembrete | Fazer **em fases**; o MVP fica fora do caixa |

---

## Ideia 1 — Aba de documentos da organização (só para donos)

### O que foi pedido
Uma aba administrativa para anexar documentos do estúdio: contrato de aluguel, contratos
de trabalho, cartão CNPJ, alvará/licença da vigilância sanitária etc.

### O que já existe e pode ser reaproveitado
- **[obs]** Anexos de cliente já estão completos: tabela `customer_attachments`, bucket
  **privado** `customer-files` (migration `0012`, leitura só por signed URL), upload com
  limite de 10 MB e tipos imagem/PDF (`customers.controller.ts`), renomear e remover.
- **[obs]** O storage está abstraído (`IStorageProvider`, ver `.memory/supabase-coupling.md`).
- **[obs]** Permissão por módulo, notificações in-app/e-mail e cron interno já existem, e
  servem para os lembretes de vencimento.

Na prática a feature é uma nova tabela `org_documents` com bucket/prefixo próprio e uma
tela em Configurações, imitando o padrão dos anexos de cliente, **com uma diferença
importante**: **[obs]** as policies RLS de `customer_attachments` liberam qualquer membro
da org (`is_org_member`, migrations `0011`/`0036`), e nenhum bucket do projeto tem policy
em `storage.objects` (todo acesso passa pelo backend com service_role). Uma cópia direta
**não** seria "só owner". A tabela nova precisa de policies com `is_org_owner` (função
que já existe e é usada em `transaction_categories`), e os endpoints precisam de checagem
de papel owner no guard, já que o arquivo em si só é protegido pelo backend.

### Pontos positivos
- Centraliza a "pasta do estúdio" dentro do sistema que o dono já usa todo dia.
- **O valor de verdade está no vencimento.** Alvará da vigilância sanitária, AVCB,
  contrato de aluguel e certidões têm validade. Com categoria + data de validade + aviso
  X dias antes (cron + notificação, infraestrutura já pronta), o ASO passa a evitar multa
  e interdição. Isso o Drive não faz sozinho, e é o argumento comercial da feature.
- Esforço baixo e risco técnico baixo.

### Pontos negativos e riscos
- **Sem validade/alerta, o valor é baixo**: concorre com Google Drive/WhatsApp, que o dono
  já usa.
- **Dados sensíveis.** Contrato de trabalho tem CPF, endereço e salário do funcionário.
  Exige:
  - acesso **só owner** (funcionário nunca vê, nem via API);
  - bucket privado + signed URL de curta duração (mesmo modelo do `customer-files`);
  - auditoria de upload, download e exclusão.
- **super_admin age como owner (ADR-0013)**, ou seja, a equipe da plataforma conseguiria
  abrir contratos do estúdio. No mínimo isso precisa ser auditado; o ideal é decidir se o
  super_admin deve ser bloqueado nesse módulo. **[em aberto]**
- **Pendência herdada do ADR-0018 (Tier 2):** a limpeza de Storage ao excluir ainda não
  está resolvida. Arquivo excluído pode ficar órfão no bucket.
- Custo de storage cresce, mas é pequeno (PDFs). Pode valer um limite por org. **[sup]**
- Pelas regras do projeto (storage/RLS), entra como tarefa **complexa** apesar de pequena:
  passa por planner + reviewer + database-guardian.

### Escopo sugerido
| Fase | Conteúdo | Esforço [inf] |
|---|---|---|
| MVP | Tabela + bucket privado, upload/listar/renomear/excluir, categoria, owner-only, auditoria | ~1–2 dias |
| + Valor | Data de validade, badge "vence em N dias", lembrete por cron (in-app + e-mail) | +1 dia |

---

## Ideia 2 — Formulário de orçamento (link no Instagram)

### O que foi pedido (juntando os prints e os áudios)
1. O estúdio/profissional publica **um link fixo** (bio do Instagram).
2. O cliente abre, **escolhe o profissional** (ou "enviar para todos", em estúdio com
   vários), preenche dados básicos + ideia da tattoo + **imagem de referência**, e envia.
   Vê um agradecimento.
3. O profissional recebe um **aviso** ("chegou um orçamento") e vê tudo numa tela: dados,
   ideia, imagem.
4. Ao final, a pergunta **"esse projeto foi agendado? sim/não"**:
   - **Sim** → informa a data e o sinal; o agendamento vai para a agenda.
   - **Não** → nome, telefone e e-mail ficam guardados para contato futuro.
5. Ao fechar, o profissional manda o **link de cadastro completo** para o cliente
   preencher o resto (áudio A-04), e daí segue o fluxo que já existe.

O exemplo do vídeo (Google Forms) mostra o que os tatuadores fazem hoje: texto longo de
apresentação ("sobre mim", "como trabalho", regras de orçamento/sinal), um aceite "li e
gostaria de preencher", perguntas abertas, escolha de cidade (guest spot) e 4 páginas.

### Por que faz sentido
- **Dor real e frequente:** o profissional com muito orçamento hoje junta Forms, planilha,
  DM e WhatsApp. Trazer para dentro do ASO elimina uma ferramenta paralela (argumento do
  João) e deixa o ASO presente **antes** do cliente existir, não só depois.
- **Gera dado de funil** que hoje não existe: orçamentos recebidos x fechados, taxa de
  conversão por profissional, origem. Depois isso vira relatório.
- **Base para remarketing** (ponto do Ruan): quem não fechou vira contato frio para as
  campanhas.
- **Encaixa no que já foi construído:** link público com token, auto-cadastro (P-2),
  Turnstile + rate limit do formulário público de suporte (ADR-0022), notificações, agenda.

### Decisão técnica central: orçamento ≠ cliente
A conversa oscilou entre "o formulário já é o cadastro" (Ruan) e "o formulário é só
interesse; cadastra se fechar" (João). O código decide boa parte disso:

- **[obs]** `customers` tem `email`, `birth_date` e `address` **NOT NULL**, além de e-mail
  único por org (`customers_org_email_lower_uq`), e o form exige número/cidade/estado.
  Transformar cada orçamento em cliente obrigaria o interessado a informar data de
  nascimento e endereço completo só para pedir preço. É exatamente a burocracia que o
  Ruan quer evitar. A alternativa seria afrouxar essas regras, o que traria cadastros
  incompletos para a lista de clientes.
- **[inf]** Lead dentro de `customers` também distorceria métricas (total de clientes),
  filtros e as **campanhas**: o gatilho de inatividade dispararia para quem nunca foi
  cliente.

**Recomendação:** uma entidade própria de orçamento/lead (`quote_requests`) com dados
mínimos (nome, WhatsApp, e-mail, cidade, ideia, referência, profissional) e status
(novo → em conversa → fechado / perdido). "Fechou" **converte** em cliente. Isso atende
João e Ruan ao mesmo tempo:
- o pré-cadastro é leve (pedido do Ruan);
- o cadastro completo só acontece quando fecha (fluxo do João, áudio A-04);
- quem não fecha continua guardado como lead, sem poluir a base de clientes.

**Cliente que já existe** pedindo novo orçamento: o backend casa o e-mail com o cadastro
existente e vincula o orçamento a ele, sem pedir os dados de novo (responde ao "preencher
os mesmos dados mais de uma vez"). A página pública **não pode revelar** que o e-mail já
existe (evita enumeração de clientes).

**Conversão no "fechou":** **[obs]** o auto-cadastro do P-2 (cenário 1) já cria o cliente
e a ficha de anamnese numa jornada só, mas está amarrado à anamnese (`serviceTypeId`
obrigatório; erro se o tipo de serviço não tem ficha configurada). Para o fluxo de
orçamento, basta enviar esse link **pré-preenchido** com os dados do lead. É uma extensão
pequena do que já existe, e o cliente precisa da anamnese antes da sessão de qualquer jeito.

### Pontos negativos e riscos
1. **Link público permanente** (diferente do P-2, que é um token por convite enviado por
   e-mail). Qualquer pessoa pode enviar a qualquer hora, o que exige o padrão do ADR-0022:
   Cloudflare Turnstile fail-closed, rate limit e `trust proxy`. Sem isso vira porta de
   spam.
2. **Upload anônimo de imagem: superfície nova.** **[obs]** O formulário público de suporte
   **não** aceita arquivo hoje. Upload sem login traz custo de storage e risco de arquivo
   malicioso. Precisa de limite de tamanho/quantidade, tipos só de imagem, bucket privado
   e captcha antes do upload.
3. **LGPD:**
   - guardar quem **não fechou** para remarketing exige **consentimento de marketing
     separado e desmarcado por padrão**, além do aceite de privacidade;
   - exige também **prazo de retenção**. O cron de retenção ainda é pendência Tier 2 do
     ADR-0018. Sem ele, "guardar lead frio para sempre" não é defensável.
4. **Remarketing não sai de graça:** **[obs]** as campanhas (ADR-0025) só alcançam
   `customers`, com opt-out em `customer_email_preferences`. Mandar campanha para lead
   exige estender o módulo. Fica para uma fase posterior.
5. **Risco de adoção (o maior, na minha leitura):** o Forms do vídeo é muito
   personalizado (apresentação longa, regras, perguntas próprias, cidades de guest spot).
   **[obs]** O motor de perguntas da anamnese só tem os tipos `text` e `yes_no`. Se o
   formulário do ASO for engessado, os tatuadores continuam no Google Forms. O MVP precisa
   pelo menos de texto de apresentação/regras editável; perguntas customizáveis (escolha,
   data, múltipla escolha) é uma fase própria.
6. **Lista pública de profissionais** expõe nome/foto da equipe. Cada membro deveria optar
   por aparecer **[em aberto]**. O orçamento direcionado a um profissional segue o mesmo
   escopo de "funcionário vê só o seu" que já existe em serviços.
7. **Caixa:** o sinal mexe em dinheiro (append-only, ADR-0010, área de maior risco). Por
   isso o MVP **não** automatiza o sinal; ele continua sendo um lançamento manual no caixa.
8. **Navegador interno do Instagram:** o vídeo mostra o form aberto dentro do Instagram,
   e o próprio Forms do tatuador pede para abrir no navegador padrão. Como quase todo o
   tráfego virá de lá, Turnstile e upload de imagem precisam ser testados no navegador
   interno do Instagram (iOS e Android) antes do lançamento. Não sei se há falha ali;
   o ponto é que precisa ser testado.
9. Itens de produto que acompanham qualquer módulo novo: toggle de permissão por módulo,
   navegação, tour de onboarding, item de changelog + bump **minor** (ADR-0031).

### Fases sugeridas
| Fase | Conteúdo | Esforço [inf] |
|---|---|---|
| **1 — MVP** | Link público por org (slug) com escolha de profissional/"todos"; form fixo (dados mínimos + ideia + até N imagens) com texto de apresentação/regras editável; Turnstile + rate limit; consentimentos; caixa de entrada de orçamentos com status; notificação in-app/e-mail; escopo por profissional; permissão de módulo | ~5–8 dias |
| **2 — Conversão** | Botão "fechou": cria evento na agenda com data, dispara link do P-2 pré-preenchido, vincula a cliente existente por e-mail; atalho para lançar o sinal no caixa (manual). **[obs]** `calendar_events.customer_id` é nullable, então o evento pode ser criado a partir do lead antes de o cliente completar o cadastro e ser vinculado na conversão, que é a ordem descrita nos áudios A-02/A-04 | ~2–3 dias |
| **3 — Diferencial** | Perguntas configuráveis por org/profissional (novos tipos), métricas de funil, leads nas campanhas de remarketing (com opt-in), cron de retenção | ~5–8 dias |

---

## Esforço e prazo

**Como estimei [inf]:** pelo ritmo observado no repositório. O P-2 (auto-cadastro,
4 fatias com backend + 2 páginas públicas + revisão) saiu em ~2 dias (backlog
2026-08-19 e git log). Os Blocos 1–5 da reunião de 15/09 saíram entre 16/09 e 20/09. As
faixas acima incluem revisão (reviewer/database-guardian) e o QA com evidência visual,
mas **não** incluem:
- texto jurídico dos consentimentos (marketing, retenção), que é decisão de negócio;
- UX/copy da página pública (se o design quiser algo próprio além do padrão atual);
- ida e volta de validação com os sócios.

**Sequenciamento:** **[obs]** produção está atualizada (até a migration `0084`, deploy de
20/09), então não há fila de deploy bloqueando. Sugestão de ordem:
1. Documentos (MVP + validade): entrega rápida, sem dependência.
2. Orçamento fase 1, depois fase 2.
3. Fase 3 conforme uso real (vale medir quantos orçamentos chegam antes de investir em
   perguntas configuráveis).

Total para as duas ideias até a fase 2 do orçamento: **~9–14 dias de desenvolvimento**
[inf] (documentos com validade 2–3 + orçamento fase 1 5–8 + fase 2 2–3), mais o tempo
de decisão de negócio.

**Lançamento:** **[obs]** o formulário público de suporte já fica atrás de um guard de
feature flag (`PublicSupportFeatureFlagGuard`). Usar o mesmo padrão no orçamento permite
liberar primeiro para a Ink House e, se for o caso, condicionar ao plano (decisão 6).

## Decisões em aberto (para os sócios)
1. **Lead que não fechou:** descartar (João) ou manter como contato frio (Ruan)? Com
   entidade separada, as duas opções funcionam; manter exige consentimento de marketing
   + prazo de retenção.
2. **Quanto o formulário deve ser personalizável no MVP:** só texto de apresentação/regras
   (recomendado) ou já com perguntas próprias?
3. **Link por estúdio ou por profissional?** (O áudio A-01 descreve os dois.) Sugestão: um
   link do estúdio com seletor, mais um link direto por profissional que já vem com ele
   selecionado.
4. **Membro aparece na página pública por padrão ou só se optar?**
5. **Documentos:** super_admin pode abrir documentos do estúdio? Haverá limite de
   armazenamento por org/plano?
6. **Monetização:** orçamento pode ser recurso de plano superior (diferencial comercial)
   ou entra no plano base?
