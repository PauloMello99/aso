import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE, DrizzleDB } from "../../../database/database.module";
import * as schema from "../../../database/schema";
import { AuthUser } from "../interfaces/auth-provider.interface";

@Injectable()
export class GetMeUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async execute(authUser: AuthUser) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.authId, authUser.id))
      .limit(1);

    if (!user) throw new NotFoundException("User profile not found");
    return user;
  }
}
