# 04 — Origens de Cliente (Customer Origins) · ♻️ A portar

## Visão
Canal pelo qual o cliente chegou ao estúdio. Base para relatórios de **aquisição** e
**conversão por canal**.

## Estado atual (ink-ops)
Tabela `customer_origins` existe (`id, org_id, name, UNIQUE(org_id, name)`) e `customers.origin_id`
referencia ela. **Sem** módulo/CRUD próprio ainda. Hoje modelada como cadastro **livre por org**.

## Legado a portar (ink-house-studio)
`customer_origins(description)` — lista simples, **texto livre**, sem org. CRUD próprio
(`/a/customer-origins`, create/delete). `customers.origin_id` → origem.

## Decisões das reuniões (11/06)
A maioria dos clientes chega por **3 canais**: Indicação, Rede social do profissional, Rede
social do estúdio. Decisão: **categorias pré-definidas** (não texto livre) para viabilizar
**relatórios globais** e comparação entre organizações.

## Comportamento alvo (V1)
> ⚠️ Conflito a resolver: o ink-ops modelou `customer_origins` como livre por org; a reunião
> pede **padronização cross-org**. Duas opções:
>
> - **A (recomendada):** catálogo **global** de origens, gerenciado pelo **super_admin**
>   (`customer_origins` sem `org_id`, ou flag `is_global`). Todas as orgs usam as mesmas
>   categorias → relatórios comparáveis. Orgs podem, no máximo, **ocultar** categorias que não usam.
> - **B:** manter por org, mas **semear** as 3 categorias padrão em toda org nova e marcar
>   `origin_id` com um “código” canônico para permitir agregação cross-org.
>
> Seed inicial: `Indicação`, `Rede social do profissional`, `Rede social do estúdio`.

- `customers.origin_id` é **opcional** (cliente pode não ter origem informada).
- Relatório de clientes agrupa por origem (ver spec 09).

## Regras de negócio
- Sem duplicatas (UNIQUE por escopo escolhido).
- Não permitir excluir origem em uso por clientes (ou exclusão lógica).

## Pendências
- Decidir entre modelo **A (global)** e **B (por org com canônico)**.
- Implementar CRUD (provavelmente restrito ao super_admin se for global).

## Revisão das reuniões (04/06 · 11/06)
> Ver [revisão por módulo §3](../reunioes/2026-revisao-funcionalidades-por-modulo.md#3-clientes--origem-do-cliente).
> Status: ✅ feito · 🟡 parcial · ⏳ pendente V1 · 🔮 V2/externo.

- ✅ **Decisão:** origem por **3 categorias fixas** (Indicação · Rede social do profissional ·
  Rede social do estúdio), não texto livre — para relatórios comparáveis entre orgs.
- ⏳ **Em aberto:** modelo **global (super_admin)** vs **por org com código canônico** (ver
  "Comportamento alvo" acima). Justificativa nas transcrições: relatório cross-org só fecha se a
  classificação for padronizada ("tem que ser zero ou um").
