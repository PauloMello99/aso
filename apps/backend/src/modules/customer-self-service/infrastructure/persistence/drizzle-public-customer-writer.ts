// Por que DRIZZLE_ADMIN aqui (e não DRIZZLE):
// Os caminhos públicos de auto-cadastro/atualização de cliente (cenários 1 e 3 de
// `customer-self-service`) não têm sessão autenticada nem claims JWT — não há
// `request.jwt.claims` para a RLS de `customers` avaliar, então as policies de
// INSERT/UPDATE (que dependem de `is_org_member(org_id)`/`is_super_admin()`, ver
// ADR-0005) simplesmente negariam a escrita. Este writer segue o mesmo padrão já
// usado em `anamnesis` (`DrizzleAnamnesisResponseRepository`, métodos acionados por
// token público como `markSubmitted`/`linkCustomer`) e, no espírito de ADR-0021
// (autorização de escrita movida para a camada de aplicação quando RLS não modela o
// caso), usa `DRIZZLE_ADMIN` deliberadamente. Diferente do caso de ADR-0021 — que é
// um caminho AUTENTICADO com `org_id` vindo de `/orgs/:orgId` + `OrgMembershipGuard` —
// aqui não há autenticação alguma: `org_id` é SEMPRE um parâmetro explícito derivado
// no use-case a partir do registro de convite/token (nunca do corpo da requisição), e
// toda query abaixo filtra por `org_id` (e por `id` quando aplicável) como defesa em
// profundidade, já que DRIZZLE_ADMIN faz bypass total de RLS.
import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, eq, ne, sql } from "drizzle-orm";
import {
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type { CustomerEntity } from "../../../customers/domain/customer.entity";
import { CustomerEmailAlreadyExistsException } from "../../../customers/domain/exceptions/customer-email-already-exists.exception";
import { CustomerMapper } from "../../../customers/infrastructure/persistence/customer.mapper";
import type {
  IPublicCustomerWriter,
  PublicCustomerCoreCreate,
  PublicCustomerCoreUpdate,
} from "../../domain/ports/public-customer-writer.port";

/** Única constraint cuja violação (23505) deve virar `CustomerEmailAlreadyExistsException`. */
const EMAIL_UNIQUE_CONSTRAINT = "customers_org_email_lower_uq";

/**
 * Percorre a cadeia de `cause` até achar um erro pg com código de unique violation
 * (23505) e retorna o nome da constraint. O driver do projeto é `pg` (node-postgres,
 * ver `database.module.ts`), que expõe `error.constraint`; lemos também
 * `constraint_name` (nome usado por `postgres-js`) por segurança, caso o driver
 * mude no futuro.
 */
function findUniqueViolationConstraint(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const candidate = error as {
    code?: unknown;
    constraint?: unknown;
    constraint_name?: unknown;
    cause?: unknown;
  };
  if (candidate.code === "23505") {
    const name = candidate.constraint ?? candidate.constraint_name;
    return typeof name === "string" ? name : undefined;
  }
  return findUniqueViolationConstraint(candidate.cause);
}

function isEmailUniqueViolation(error: unknown): boolean {
  return findUniqueViolationConstraint(error) === EMAIL_UNIQUE_CONSTRAINT;
}

/**
 * Normaliza e-mail para casar com o índice `lower(btrim(email))`. A coluna `email`
 * é `NOT NULL` no schema (não é possível gravar SQL NULL sem migration), então o
 * resultado pode ser string vazia — cabe a cada chamador decidir o que fazer com
 * esse caso (ver `createForOrg`/`updateCoreFields` abaixo).
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

@Injectable()
export class DrizzlePublicCustomerWriter implements IPublicCustomerWriter {
  private readonly logger = new Logger(DrizzlePublicCustomerWriter.name);

  constructor(@Inject(DRIZZLE_ADMIN) private readonly admin: DrizzleDB) {}

  async findByEmailInOrg(
    orgId: string,
    email: string,
    excludeId?: string,
  ): Promise<{ id: string } | null> {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;

    const conditions = [
      eq(schema.customers.orgId, orgId),
      sql`lower(btrim(${schema.customers.email})) = ${normalized}`,
    ];
    if (excludeId) {
      conditions.push(ne(schema.customers.id, excludeId));
    }

    const [row] = await this.admin
      .select({ id: schema.customers.id })
      .from(schema.customers)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  }

  async findByIdInOrg(
    id: string,
    orgId: string,
  ): Promise<CustomerEntity | null> {
    const [row] = await this.admin
      .select()
      .from(schema.customers)
      .where(
        and(eq(schema.customers.id, id), eq(schema.customers.orgId, orgId)),
      )
      .limit(1);
    return row ? CustomerMapper.toDomain(row) : null;
  }

  async createForOrg(
    orgId: string,
    data: PublicCustomerCoreCreate,
  ): Promise<CustomerEntity> {
    try {
      const [row] = await this.admin
        .insert(schema.customers)
        .values({
          orgId,
          createdBy: null,
          originId: null,
          notes: null,
          name: data.name,
          email: normalizeEmail(data.email),
          phone: data.phone ?? null,
          birthDate: data.birthDate,
          gender: data.gender ?? null,
          address: data.address,
          number: data.number,
          addressLine2: data.addressLine2 ?? null,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode ?? null,
          country: data.country ?? null,
        })
        .returning();
      if (!row) throw new Error("Failed to create customer");
      return CustomerMapper.toDomain(row);
    } catch (error) {
      if (isEmailUniqueViolation(error)) {
        throw new CustomerEmailAlreadyExistsException(data.email);
      }
      throw error;
    }
  }

  async updateCoreFields(
    id: string,
    orgId: string,
    data: PublicCustomerCoreUpdate,
  ): Promise<CustomerEntity | null> {
    // Normaliza antes de decidir se o e-mail entra no SET: string vazia após
    // trim é tratada como "campo não fornecido" (coluna é NOT NULL, não há como
    // gravar SQL NULL sem migration), preservando o e-mail já cadastrado.
    const normalizedEmail =
      data.email !== undefined ? normalizeEmail(data.email) : undefined;

    try {
      const [row] = await this.admin
        .update(schema.customers)
        .set({
          ...(data.name !== undefined && { name: data.name }),
          ...(normalizedEmail !== undefined &&
            normalizedEmail !== "" && { email: normalizedEmail }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.birthDate !== undefined && { birthDate: data.birthDate }),
          ...(data.gender !== undefined && { gender: data.gender }),
          ...(data.address !== undefined && { address: data.address }),
          ...(data.number !== undefined && { number: data.number }),
          ...(data.addressLine2 !== undefined && {
            addressLine2: data.addressLine2,
          }),
          ...(data.city !== undefined && { city: data.city }),
          ...(data.state !== undefined && { state: data.state }),
          ...(data.postalCode !== undefined && {
            postalCode: data.postalCode,
          }),
          ...(data.country !== undefined && { country: data.country }),
          updatedAt: new Date(),
        })
        .where(
          and(eq(schema.customers.id, id), eq(schema.customers.orgId, orgId)),
        )
        .returning();
      if (!row) {
        this.logger.error(
          `updateCoreFields: no row matched id=${id} orgId=${orgId} (id does not belong to org or does not exist)`,
        );
        return null;
      }
      return CustomerMapper.toDomain(row);
    } catch (error) {
      if (isEmailUniqueViolation(error)) {
        throw new CustomerEmailAlreadyExistsException(normalizedEmail ?? "");
      }
      throw error;
    }
  }
}
