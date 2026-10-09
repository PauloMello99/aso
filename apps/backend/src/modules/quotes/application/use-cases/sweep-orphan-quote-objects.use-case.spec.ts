import { Logger } from "@nestjs/common";
import { SweepOrphanQuoteObjectsUseCase } from "./sweep-orphan-quote-objects.use-case";
import { QUOTE_REQUEST_IMAGES_BUCKET } from "./submit-quote-request.use-case";
import { ICronJobStateRepository } from "../../../../common/cron/cron-job-state.repository.interface";
import { CRON_JOBS } from "../../../../common/cron/cron-jobs";
import { IQuoteRequestPurgeRepository } from "../../domain/quote-request-purge.repository.interface";
import {
  IStorageProvider,
  StorageObjectEntry,
} from "../../../auth/application/ports/storage-provider.interface";
import {
  QUOTE_ORPHAN_SWEEP_INTERVAL_MS,
  QUOTE_ORPHAN_SWEEP_MAX_REMOVALS,
  QUOTE_ORPHAN_SWEEP_MAX_REQUEST_FOLDERS,
} from "../../domain/quote-request-lifecycle";

const NOW = new Date("2026-10-08T12:00:00Z");
const HOUR_MS = 60 * 60_000;
const ORG = "11111111-1111-1111-1111-111111111111";
const ORG_2 = "33333333-3333-3333-3333-333333333333";
const LIVE = "22222222-2222-2222-2222-222222222222";
const ORPHAN = "44444444-4444-4444-4444-444444444444";
const ORPHAN_2 = "55555555-5555-5555-5555-555555555555";

function folder(prefix: string, name: string): StorageObjectEntry {
  return {
    name,
    path: prefix ? `${prefix}/${name}` : name,
    kind: "folder",
    createdAt: null,
  };
}

function file(
  prefix: string,
  name: string,
  ageHours: number | null,
): StorageObjectEntry {
  return {
    name,
    path: `${prefix}/${name}`,
    kind: "file",
    createdAt:
      ageHours === null ? null : new Date(NOW.getTime() - ageHours * HOUR_MS),
  };
}

type Tree = Record<string, StorageObjectEntry[]>;

function buildFakeStorage(tree: Tree): jest.Mocked<IStorageProvider> {
  return {
    listObjects: jest.fn((_bucket: string, prefix: string) =>
      Promise.resolve(tree[prefix] ?? []),
    ),
    removeFiles: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<IStorageProvider>;
}

function buildFakeRepo(
  existing: string[] = [],
  overrides: Partial<jest.Mocked<IQuoteRequestPurgeRepository>> = {},
): jest.Mocked<IQuoteRequestPurgeRepository> {
  return {
    findExistingRequestIds: jest
      .fn()
      .mockImplementation((_org: string, ids: string[]) =>
        Promise.resolve(new Set(ids.filter((id) => existing.includes(id)))),
      ),
    ...overrides,
  } as unknown as jest.Mocked<IQuoteRequestPurgeRepository>;
}

function buildFakeCron(claimed = true): jest.Mocked<ICronJobStateRepository> {
  return {
    claimRun: jest.fn().mockResolvedValue(claimed),
  } as unknown as jest.Mocked<ICronJobStateRepository>;
}

function build(
  tree: Tree,
  repo = buildFakeRepo(),
  cron = buildFakeCron(),
) {
  const storage = buildFakeStorage(tree);
  const useCase = new SweepOrphanQuoteObjectsUseCase(cron, repo, storage);
  return { useCase, storage, repo, cron };
}

describe("SweepOrphanQuoteObjectsUseCase", () => {
  let log: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, "warn").mockImplementation();
    log = jest.spyOn(Logger.prototype, "log").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("throttled: nao lista nem remove nada e nao loga", async () => {
    const { useCase, storage, repo, cron } = build({}, buildFakeRepo(), buildFakeCron(false));

    const result = await useCase.execute(NOW);

    expect(result.skipped).toBe("throttled");
    expect(cron.claimRun).toHaveBeenCalledWith(
      CRON_JOBS.QUOTE_ORPHAN_SWEEP,
      NOW,
      QUOTE_ORPHAN_SWEEP_INTERVAL_MS,
    );
    expect(storage.listObjects).not.toHaveBeenCalled();
    expect(repo.findExistingRequestIds).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });

  it("remove arquivo orfao de 25h, mantem o de 1h e o de createdAt nulo; par existente intocado", async () => {
    const orphanPrefix = `${ORG}/${ORPHAN}`;
    const { useCase, storage, repo } = build(
      {
        "": [folder("", ORG)],
        [ORG]: [folder(ORG, LIVE), folder(ORG, ORPHAN)],
        [`${ORG}/${LIVE}`]: [file(`${ORG}/${LIVE}`, "keep.png", 100)],
        [orphanPrefix]: [
          file(orphanPrefix, "old.png", 25),
          file(orphanPrefix, "new.png", 1),
          file(orphanPrefix, "nodate.png", null),
        ],
      },
      buildFakeRepo([LIVE]),
    );

    const result = await useCase.execute(NOW);

    expect(repo.findExistingRequestIds).toHaveBeenCalledWith(ORG, [LIVE, ORPHAN]);
    expect(storage.removeFiles).toHaveBeenCalledTimes(1);
    expect(storage.removeFiles).toHaveBeenCalledWith(
      QUOTE_REQUEST_IMAGES_BUCKET,
      [`${orphanPrefix}/old.png`],
    );
    expect(result).toEqual({
      orgs: 1,
      orphanRequests: 1,
      removed: 1,
      failed: 0,
      truncated: false,
    });
  });

  it("erro em findExistingRequestIds: zero removeFiles e a org conta como falha", async () => {
    const orphanPrefix = `${ORG}/${ORPHAN}`;
    const repo = buildFakeRepo([], {
      findExistingRequestIds: jest.fn().mockRejectedValue(new Error("db down")),
    });
    const { useCase, storage } = build(
      {
        "": [folder("", ORG)],
        [ORG]: [folder(ORG, ORPHAN)],
        [orphanPrefix]: [file(orphanPrefix, "old.png", 100)],
      },
      repo,
    );

    const result = await useCase.execute(NOW);

    expect(storage.removeFiles).not.toHaveBeenCalled();
    expect(result.failed).toBe(1);
    expect(result.removed).toBe(0);
  });

  it("falha de uma org nao impede a proxima", async () => {
    const orphanPrefix = `${ORG_2}/${ORPHAN}`;
    const repo = buildFakeRepo([], {
      findExistingRequestIds: jest
        .fn()
        .mockRejectedValueOnce(new Error("db down"))
        .mockResolvedValueOnce(new Set<string>()),
    });
    const { useCase, storage } = build(
      {
        "": [folder("", ORG), folder("", ORG_2)],
        [ORG]: [folder(ORG, LIVE)],
        [ORG_2]: [folder(ORG_2, ORPHAN)],
        [orphanPrefix]: [file(orphanPrefix, "old.png", 30)],
      },
      repo,
    );

    const result = await useCase.execute(NOW);

    expect(storage.removeFiles).toHaveBeenCalledWith(
      QUOTE_REQUEST_IMAGES_BUCKET,
      [`${orphanPrefix}/old.png`],
    );
    expect(result.failed).toBe(1);
    expect(result.removed).toBe(1);
  });

  it("pastas que nao sao UUID (raiz e nivel da org) sao ignoradas e nunca removidas", async () => {
    const { useCase, storage, repo } = build({
      "": [
        folder("", "tmp"),
        folder("", "AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA"),
      ],
      [ORG]: [],
    });

    const result = await useCase.execute(NOW);

    expect(result.orgs).toBe(0);
    expect(repo.findExistingRequestIds).not.toHaveBeenCalled();
    expect(storage.removeFiles).not.toHaveBeenCalled();
  });

  it("nivel da org com subpasta nao-UUID: so as UUID entram na consulta", async () => {
    const { useCase, repo } = build(
      { "": [folder("", ORG)], [ORG]: [folder(ORG, "lixo"), folder(ORG, LIVE)] },
      buildFakeRepo([LIVE]),
    );

    await useCase.execute(NOW);

    expect(repo.findExistingRequestIds).toHaveBeenCalledWith(ORG, [LIVE]);
  });

  it("org removida (nenhum pedido existe) tem os arquivos antigos limpos", async () => {
    const prefix = `${ORG}/${ORPHAN}`;
    const { useCase, storage } = build({
      "": [folder("", ORG)],
      [ORG]: [folder(ORG, ORPHAN)],
      [prefix]: [file(prefix, "a.png", 48)],
    });

    const result = await useCase.execute(NOW);

    expect(storage.removeFiles).toHaveBeenCalledWith(
      QUOTE_REQUEST_IMAGES_BUCKET,
      [`${prefix}/a.png`],
    );
    expect(result.removed).toBe(1);
  });

  it("erro de remocao em um pedido e isolado: o proximo continua", async () => {
    const p1 = `${ORG}/${ORPHAN}`;
    const p2 = `${ORG}/${ORPHAN_2}`;
    const { useCase, storage } = build({
      "": [folder("", ORG)],
      [ORG]: [folder(ORG, ORPHAN), folder(ORG, ORPHAN_2)],
      [p1]: [file(p1, "a.png", 30)],
      [p2]: [file(p2, "b.png", 30)],
    });
    storage.removeFiles.mockRejectedValueOnce(new Error("boom"));

    const result = await useCase.execute(NOW);

    expect(storage.removeFiles).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ failed: 1, removed: 1, orphanRequests: 2 });
  });

  it("truncated pela contagem BRUTA de pastas (nao-UUID tambem consomem o teto)", async () => {
    const junk = Array.from(
      { length: QUOTE_ORPHAN_SWEEP_MAX_REQUEST_FOLDERS },
      (_, i) => folder(ORG, `lixo-${i}`),
    );
    const { useCase, storage } = build({
      "": [folder("", ORG)],
      [ORG]: junk,
    });

    const result = await useCase.execute(NOW);

    expect(storage.listObjects).toHaveBeenCalledWith(
      QUOTE_REQUEST_IMAGES_BUCKET,
      ORG,
      { maxEntries: QUOTE_ORPHAN_SWEEP_MAX_REQUEST_FOLDERS },
    );
    expect(result.truncated).toBe(true);
    expect(storage.removeFiles).not.toHaveBeenCalled();
  });

  it("abaixo do teto de pastas nao marca truncated", async () => {
    const { useCase } = build({
      "": [folder("", ORG)],
      [ORG]: [folder(ORG, LIVE)],
    }, buildFakeRepo([LIVE]));

    const result = await useCase.execute(NOW);

    expect(result.truncated).toBe(false);
  });

  it("respeita o teto de remocoes e marca truncated", async () => {
    const p1 = `${ORG}/${ORPHAN}`;
    const many = Array.from(
      { length: QUOTE_ORPHAN_SWEEP_MAX_REMOVALS + 5 },
      (_, i) => file(p1, `f${i}.png`, 30),
    );
    const { useCase, storage } = build({
      "": [folder("", ORG)],
      [ORG]: [folder(ORG, ORPHAN)],
      [p1]: many,
    });

    const result = await useCase.execute(NOW);

    expect(result.removed).toBe(QUOTE_ORPHAN_SWEEP_MAX_REMOVALS);
    expect(result.truncated).toBe(true);
    expect(storage.removeFiles.mock.calls[0]![1]).toHaveLength(
      QUOTE_ORPHAN_SWEEP_MAX_REMOVALS,
    );
  });

  it("log de resumo so tem contagens (sem ids nem paths)", async () => {
    const prefix = `${ORG}/${ORPHAN}`;
    const { useCase } = build({
      "": [folder("", ORG)],
      [ORG]: [folder(ORG, ORPHAN)],
      [prefix]: [file(prefix, "a.png", 48)],
    });

    await useCase.execute(NOW);

    const logged = log.mock.calls.map((c: unknown[]) => String(c[0])).join("\n");
    expect(logged).toContain("removed=1");
    expect(logged).not.toContain(ORG);
    expect(logged).not.toContain(ORPHAN);
  });
});
