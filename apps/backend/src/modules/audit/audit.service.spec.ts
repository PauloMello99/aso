import { AuditService, AuditEntry } from "./audit.service";
import { IUserRepository } from "../user/domain/user.repository.interface";
import {
  runWithActingContext,
  markActingAsSuperAdmin,
} from "../../common/request-context/acting-context";
import type { DrizzleDB } from "../../database/database.module";

function buildFakeEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    actorId: "actor-1",
    orgId: "org-1",
    action: "update",
    entityType: "customer",
    entityId: "entity-1",
    ...overrides,
  };
}

function buildService(): {
  service: AuditService;
  insertValues: jest.Mock;
} {
  const insertValues = jest.fn().mockResolvedValue(undefined);
  const db = {
    insert: jest.fn().mockReturnValue({ values: insertValues }),
  } as unknown as jest.Mocked<DrizzleDB>;
  const userRepo = {
    findByAuthId: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findPlatformAdminEmails: jest.fn(),
  } as unknown as jest.Mocked<IUserRepository>;

  const service = new AuditService(db, userRepo);
  return { service, insertValues };
}

// registerPostCommit, fora de um request (sem RlsContext ativo), agenda o
// hook via microtask (Promise.resolve().then(fn)) em vez de rodar sync - por
// isso os testes flusham microtasks depois de sair do bloco de contexto, pra
// dar tempo do hook (que faz o insert simulado) rodar antes das assertions.
// O que os testes garantem: `metadata.viaSuperAdmin` chega correto no insert
// simulado, refletindo o estado de isActingAsSuperAdmin() no momento em que
// log() foi chamado - AuditService.log() le isActingAsSuperAdmin() de forma
// sincrona, no topo, antes de agendar o hook (ver comentario em
// audit.service.ts), entao o valor ja vai "congelado" no metadata capturado
// por closure. Isso NAO prova que a leitura em si seja sincrona por
// necessidade do AsyncLocalStorage: como o RlsInterceptor envolve toda a
// janela do request (guards -> handler -> hooks pos-commit) com
// runWithActingContext, uma leitura tardia dentro do hook propagaria o mesmo
// valor igualmente, por herdar o mesmo contexto do ALS.
async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await new Promise(process.nextTick);
}

describe("AuditService", () => {
  it("marca metadata.viaSuperAdmin = true quando log() e chamado dentro de runWithActingContext(true, ...)", async () => {
    const { service, insertValues } = buildService();

    await runWithActingContext(true, async () => {
      await service.log(buildFakeEntry({ metadata: { foo: "bar" } }));
    });
    await flushMicrotasks();

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { foo: "bar", viaSuperAdmin: true },
      }),
    );
  });

  it("marca metadata.viaSuperAdmin = true quando markActingAsSuperAdmin() e chamado dentro do contexto", async () => {
    const { service, insertValues } = buildService();

    await runWithActingContext(false, async () => {
      markActingAsSuperAdmin();
      await service.log(buildFakeEntry({ metadata: { foo: "bar" } }));
    });
    await flushMicrotasks();

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { foo: "bar", viaSuperAdmin: true },
      }),
    );
  });

  it("preserva o metadata original (sem viaSuperAdmin) quando log() e chamado fora de qualquer runWithActingContext", async () => {
    const { service, insertValues } = buildService();

    await service.log(buildFakeEntry({ metadata: { foo: "bar" } }));
    await flushMicrotasks();

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { foo: "bar" },
      }),
    );
  });

  it("preserva metadata null quando log() e chamado fora de contexto e sem metadata", async () => {
    const { service, insertValues } = buildService();

    await service.log(buildFakeEntry());
    await flushMicrotasks();

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: null,
      }),
    );
  });

  it("override explicito actingAsSuperAdmin: false vence o ambiente true", async () => {
    const { service, insertValues } = buildService();

    await runWithActingContext(true, async () => {
      await service.log(
        buildFakeEntry({ metadata: { foo: "bar" }, actingAsSuperAdmin: false }),
      );
    });
    await flushMicrotasks();

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { foo: "bar" },
      }),
    );
  });
});
