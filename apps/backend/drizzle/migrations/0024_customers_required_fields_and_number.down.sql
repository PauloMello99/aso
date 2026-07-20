-- 0024 down — reverte SO as constraints/coluna. O DELETE de reset e IRREVERSIVEL (mesmo
-- padrao ja aceito em 0018/0023): dados deletados nao retornam.
ALTER TABLE "customers" ALTER COLUMN "state" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "city" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "address" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "birth_date" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "email" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "customers" DROP COLUMN IF EXISTS "number";
