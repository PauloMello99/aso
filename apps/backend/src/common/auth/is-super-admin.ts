import { eq } from "drizzle-orm";
import type { DrizzleDB } from "../../database/database.module";
import * as schema from "../../database/schema";

export async function isSuperAdmin(
  db: DrizzleDB,
  authId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ platformRole: schema.users.platformRole })
    .from(schema.users)
    .where(eq(schema.users.authId, authId))
    .limit(1);
  return row?.platformRole === "super_admin";
}
