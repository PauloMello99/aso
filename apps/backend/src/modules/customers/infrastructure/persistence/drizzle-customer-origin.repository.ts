import { Inject, Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import { DRIZZLE, DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import {
  CustomerOriginDto,
  ICustomerOriginRepository,
} from "../../domain/customer-origin.repository.interface";

@Injectable()
export class DrizzleCustomerOriginRepository
  implements ICustomerOriginRepository
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findByOrg(orgId: string): Promise<CustomerOriginDto[]> {
    return this.db
      .select({
        id: schema.customerOrigins.id,
        name: schema.customerOrigins.name,
      })
      .from(schema.customerOrigins)
      .where(eq(schema.customerOrigins.orgId, orgId))
      .orderBy(asc(schema.customerOrigins.name));
  }
}
