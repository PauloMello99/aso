import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuditService } from "../../../audit/audit.service";
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from "../../../organizations/domain/org.repository.interface";
import { validateCampaignBody, type TiptapDoc } from "../../domain/campaign-body";
import { campaignImageSrcPrefix } from "../../domain/campaign-image";
import type { CampaignTrigger } from "../../domain/campaign-trigger";
import type { Campaign } from "../../domain/campaign.entity";
import {
  CAMPAIGN_REPOSITORY,
  ICampaignRepository,
} from "../../domain/campaign.repository.interface";
import { CampaignInvalidInactivityMonthsException } from "../../domain/exceptions/campaign-invalid-inactivity-months.exception";
import { CampaignSettingsForbiddenException } from "../../domain/exceptions/campaign-settings-forbidden.exception";
import { CampaignTriggerAlreadyUsedException } from "../../domain/exceptions/campaign-trigger-already-used.exception";

const INACTIVITY_MONTHS_MIN = 1;
const INACTIVITY_MONTHS_MAX = 36;

/**
 * Colunas com DEFAULT no banco — baseline do diff `changed` do audit log (mesmo
 * molde de `CAMPAIGN_SETTINGS_BASELINE` do upsert). `name` é `""` porque é
 * sempre informado na criação: aparecerá em `changed` em toda criação.
 */
const CREATE_BASELINE = {
  name: "",
  enabled: false,
  subject: null as string | null,
  body: null as TiptapDoc | null,
  inactivityMonths: null as number | null,
};

export interface CreateCampaignInput {
  orgId: string;
  authId: string;
  trigger: CampaignTrigger;
  name: string;
  enabled: boolean;
  subject: string | null;
  body: unknown;
  inactivityMonths: number | null;
}

/**
 * Trim + colapsa vazio/whitespace para `null` — molde `normalizeText` do
 * `UpsertOrgCampaignSettingsUseCase`. `""` significa "usar o default autoral" e
 * não pode chegar ao banco (CHECK `campaigns_subject_check` rejeita string
 * vazia). NÃO remove CR/LF nem corta em 200: isso é no envio
 * (`resolveCampaignCopy`); aqui o assunto é guardado cru e trimado, e o teto de
 * 200 é do DTO (passo 7).
 */
function normalizeSubject(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * `inactivityMonths` só existe para o gatilho `inactivity` (CHECK
 * `campaigns_inactivity_months_check`: `BETWEEN 1 AND 36` para `inactivity`,
 * `IS NULL` para os demais).
 *
 *   - gatilho ≠ inactivity  → força `null` (ignora o valor recebido, mesmo que
 *     o cliente mande um número — o DTO do passo 7 não deveria, mas defense
 *     in depth sem ruído: força em vez de lançar).
 *   - gatilho = inactivity, valor ausente/não-finito → lança
 *     `CampaignInvalidInactivityMonthsException` (→ 400): não há valor válido
 *     para normalizar e o DTO do passo 7 nem sempre barra o caso patológico.
 *   - gatilho = inactivity, número válido → `Math.trunc` + clamp 1–36.
 */
function resolveInactivityMonths(
  trigger: CampaignTrigger,
  raw: number | null,
): number | null {
  if (trigger !== "inactivity") {
    return null;
  }
  if (raw === null || !Number.isFinite(raw)) {
    throw new CampaignInvalidInactivityMonthsException();
  }
  return Math.min(
    INACTIVITY_MONTHS_MAX,
    Math.max(INACTIVITY_MONTHS_MIN, Math.trunc(raw)),
  );
}

/**
 * Criação de campanha do DONO da org (T6 rework, Fatia 6).
 *
 * Double-check de owner espelhando `UpsertOrgCampaignSettingsUseCase`: o
 * `OrgOwnerGuard` já barra no controller (passo 7), mas o use-case revalida via
 * `orgRepo.isOwner` (trata `super_admin` como owner, ADR-0013).
 *
 * Pré-check de gatilho já usado dá a mensagem boa no caso comum, mas NÃO é a
 * garantia: `DrizzleCampaignRepository.create` traduz o 23505 da unique
 * `campaigns_org_trigger_uq` para a MESMA exception (corrida de dois POSTs).
 *
 * Auditoria: `campaign_settings_updated` (ação compartilhada com update/delete,
 * distinguidos por `metadata.operation`) via `AuditService.logByAuthId`.
 * `metadata` nunca carrega `subject`/`body` — só o literal `"body"` em
 * `changed` quando o corpo foi definido.
 */
@Injectable()
export class CreateCampaignUseCase {
  constructor(
    @Inject(CAMPAIGN_REPOSITORY)
    private readonly repo: ICampaignRepository,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
    private readonly auditService: AuditService,
    private readonly config: ConfigService,
  ) {}

  async execute(input: CreateCampaignInput): Promise<Campaign> {
    const isOwner = await this.orgRepo.isOwner(input.orgId, input.authId);
    if (!isOwner) {
      throw new CampaignSettingsForbiddenException();
    }

    const existing = await this.repo.findAllByOrg(input.orgId);
    if (existing.some((campaign) => campaign.trigger === input.trigger)) {
      throw new CampaignTriggerAlreadyUsedException();
    }

    const name = input.name.trim();
    const subject = normalizeSubject(input.subject);
    const imageSrcPrefix = campaignImageSrcPrefix(
      this.config.get<string>("SUPABASE_URL"),
    );
    const body =
      input.body === null || input.body === undefined
        ? null
        : validateCampaignBody(input.body, { imageSrcPrefix });
    const inactivityMonths = resolveInactivityMonths(
      input.trigger,
      input.inactivityMonths,
    );

    const created = await this.repo.create({
      orgId: input.orgId,
      trigger: input.trigger,
      name,
      enabled: input.enabled,
      subject,
      body,
      inactivityMonths,
    });

    const resolved = {
      name,
      enabled: input.enabled,
      subject,
      body,
      inactivityMonths,
    };
    const changed = (
      Object.keys(CREATE_BASELINE) as Array<keyof typeof CREATE_BASELINE>
    ).filter((key) => resolved[key] !== CREATE_BASELINE[key]);

    await this.auditService.logByAuthId(input.authId, {
      orgId: input.orgId,
      action: "campaign_settings_updated",
      entityType: "campaign",
      entityId: created.id,
      metadata: {
        operation: "created",
        trigger: created.trigger,
        campaignId: created.id,
        changed,
      },
    });

    return created;
  }
}
