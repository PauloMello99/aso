import { ResolveOrgBySlugUseCase } from "./resolve-org-by-slug.use-case";
import { IOrganizationRepository } from "../../domain/org.repository.interface";
import { OrgEntity } from "../../domain/org.entity";
import { OrgNotFoundException } from "../../domain/exceptions/org-not-found.exception";
import { AuditService } from "../../../audit/audit.service";
import {
  markActingAsSuperAdmin,
  runWithActingContext,
} from "../../../../common/request-context/acting-context";

function buildOrg(overrides: Partial<Parameters<typeof OrgEntity.create>[0]> = {}): OrgEntity {
  return OrgEntity.create({
    id: "org-1",
    name: "Estúdio Teste",
    slug: "estudio-teste",
    logoUrl: null,
    role: "owner",
    permissions: [],
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

function buildFakeOrgRepo(
  overrides: Partial<jest.Mocked<IOrganizationRepository>> = {},
): jest.Mocked<IOrganizationRepository> {
  return {
    findAllByAuthId: jest.fn(),
    findByIdAndAuthId: jest.fn(),
    findBySlugAndAuthId: jest.fn().mockResolvedValue(buildOrg()),
    isOwner: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IOrganizationRepository>;
}

function buildFakeAuditService(
  overrides: Partial<jest.Mocked<AuditService>> = {},
): jest.Mocked<AuditService> {
  return {
    log: jest.fn().mockResolvedValue(undefined),
    logByAuthId: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as jest.Mocked<AuditService>;
}

interface Deps {
  orgRepo: jest.Mocked<IOrganizationRepository>;
  auditService: jest.Mocked<AuditService>;
}

function buildUseCase(overrides: Partial<Deps> = {}) {
  const deps: Deps = {
    orgRepo: buildFakeOrgRepo(),
    auditService: buildFakeAuditService(),
    ...overrides,
  };

  const useCase = new ResolveOrgBySlugUseCase(deps.orgRepo, deps.auditService);

  return { useCase, ...deps };
}

describe("ResolveOrgBySlugUseCase", () => {
  it("lança OrgNotFoundException e não audita quando a org não é encontrada", async () => {
    const { useCase, auditService } = buildUseCase({
      orgRepo: buildFakeOrgRepo({
        findBySlugAndAuthId: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(
      runWithActingContext(true, () => useCase.execute("estudio-teste", "auth-1")),
    ).rejects.toBeInstanceOf(OrgNotFoundException);
    expect(auditService.logByAuthId).not.toHaveBeenCalled();
  });

  it("não audita numa resolução normal, sem contexto de super_admin", async () => {
    const { useCase, auditService } = buildUseCase();

    const org = await useCase.execute("estudio-teste", "auth-1");

    expect(org.slug).toBe("estudio-teste");
    expect(auditService.logByAuthId).not.toHaveBeenCalled();
  });

  it("audita org_admin_access quando resolvida dentro de contexto de síntese de super_admin", async () => {
    const { useCase, auditService } = buildUseCase();

    await runWithActingContext(true, () => useCase.execute("estudio-teste", "auth-1"));

    expect(auditService.logByAuthId).toHaveBeenCalledWith("auth-1", {
      action: "org_admin_access",
      entityType: "organization",
      entityId: "org-1",
      orgId: "org-1",
      metadata: { slug: "estudio-teste" },
    });
  });

  it("audita org_admin_access no caminho real de produção: contexto entra sem super_admin e o repositório marca a síntese durante a resolução", async () => {
    // GET /orgs/by-slug/:slug só tem AuthGuard — nenhum guard de org roda, então
    // o RlsInterceptor semeia `false`. O sinal de super_admin só surge porque
    // DrizzleOrgRepository.findBySlugAndAuthId chama markActingAsSuperAdmin()
    // DENTRO do await, antes de resolver a org. Este cenário espelha isso e
    // falha se a leitura de isActingAsSuperAdmin() for movida para antes do
    // await de findBySlugAndAuthId.
    const { useCase, auditService } = buildUseCase({
      orgRepo: buildFakeOrgRepo({
        findBySlugAndAuthId: jest.fn().mockImplementation(async () => {
          markActingAsSuperAdmin();
          return buildOrg();
        }),
      }),
    });

    await runWithActingContext(false, () => useCase.execute("estudio-teste", "auth-1"));

    expect(auditService.logByAuthId).toHaveBeenCalledWith("auth-1", {
      action: "org_admin_access",
      entityType: "organization",
      entityId: "org-1",
      orgId: "org-1",
      metadata: { slug: "estudio-teste" },
    });
  });
});
