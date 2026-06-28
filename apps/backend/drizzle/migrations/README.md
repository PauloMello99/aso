# Migrations — ink-ops backend

Migrator próprio (`src/database/migrator.ts`), executado via:

```bash
pnpm db:migrate          # = tsx src/database/migrator.ts up   (aplica pendentes)
pnpm exec tsx src/database/migrator.ts status   # estado aplicado/pendente
pnpm exec tsx src/database/migrator.ts down [n]  # rollback (exige .down.sql)
```

O `up` usa o `migrate()` padrão do drizzle-orm, que lê `meta/_journal.json` + os
arquivos `NNNN_*.sql` e aplica os que ainda não estão em `drizzle.__drizzle_migrations`.

## ⚠️ Snapshots e `drizzle-kit generate` (DX-2)

As migrations **0000–0002** foram geradas pelo `drizzle-kit` e têm snapshot em
`meta/NNNN_snapshot.json`. A partir da **0003**, as migrations são **SQL custom
escritas à mão** (RLS, buckets, backfills, alterações pontuais) e **não têm snapshot**.

Consequência: **não rode `drizzle-kit generate` esperando regenerar o estado atual** —
ele compararia o schema TS contra o último snapshot (parado na 0002) e produziria um
diff gigante/divergente, ignorando tudo que foi feito à mão da 0003 em diante.

Regra prática:

- **Mudança de schema simples e padrão** → escreva o SQL à mão como nova migration
  custom (passos abaixo). É o caminho default deste projeto.
- Se algum dia for necessário voltar a usar `drizzle-kit generate`, primeiro **realinhe
  o snapshot** ao estado real do banco (gerar um snapshot baseline) antes de confiar no
  diff — caso contrário ele diverge.

## Como adicionar uma migration custom

1. Crie `drizzle/migrations/NNNN_descricao.sql` (use `--> statement-breakpoint` entre
   statements). Opcionalmente `NNNN_descricao.down.sql` para permitir rollback.
2. Adicione a entrada correspondente em `meta/_journal.json` (`idx` sequencial, `when`
   crescente, `tag` = nome do arquivo sem extensão, `breakpoints: true`).
3. `pnpm db:migrate` e confira com `... migrator.ts status`.

> O `idx`/`tag` no journal precisam casar exatamente com o arquivo — o hash gravado em
> `__drizzle_migrations` é o `sha256` do conteúdo do `.sql`.
