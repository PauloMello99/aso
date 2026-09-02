import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuditService } from "../../../audit/audit.service";
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from "../../../organizations/domain/org.repository.interface";
import { validateCampaignBody } from "../../domain/campaign-body";
import { campaignImageSrcPrefix } from "../../domain/campaign-image";
import type { CampaignTrigger } from "../../domain/campaign-trigger";
import type { Campaign } from "../../domain/campaign.entity";
import {
  CAMPAIGN_REPOSITORY,
  ICampaignRepository,
  type UpdateCampaignPatch,
} from "../../domain/campaign.repository.interface";
import { CampaignInvalidInactivityMonthsException } from "../../domain/exceptions/campaign-invalid-inactivity-months.exception";
import { CampaignNotFoundException } from "../../domain/exceptions/campaign-not-found.exception";
import { CampaignSettingsForbiddenException } from "../../domain/exceptions/campaign-settings-forbidden.exception";

const INACTIVITY_MONTHS_MIN = 1;
const INACTIVITY_MONTHS_MAX = 36;

export interface UpdateCampaignInput {
  orgId: string;
  authId: string;
  id: string;
  patch: UpdateCampaignPatch;
}

/** Ver `normalizeSubject` do `CreateCampaignUseCase` — mesmo racional. */
function normalizeSubject(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * `inactivityMonths` num update: a coerência é ditada pelo gatilho da campanha
 * EXISTENTE (`trigger` é imutável, nem entra em `UpdateCampaignPatch`).
 *
 *   - campanha ≠ inactivity → `{ set: false }`: não escreve a coluna (já é
 *     NULL pelo CHECK). Ignora o campo em vez de lançar — defense in depth sem
 *     ruído; o DTO do passo 7 não o expõe nesse caso.
 *   - campanha = inactivity, patch traz `null`/não-finito → lança
 *     `CampaignInvalidInactivityMonthsException` (→ 400): zerar a janela
 *     violaria `campaigns_inactivity_months_check`.
 *   - campanha = inactivity, número válido → `Math.trunc` + clamp 1–36.
 */
function resolveInactivityMonths(
  trigger: CampaignTrigger,
  raw: number | null,
): { set: false } | { set: true; value: number } {
  if (trigger !== "inactivity") {
    return { set: false };
  }
  if (raw === null || !Number.isFinite(raw)) {
    throw new CampaignInvalidInactivityMonthsException();
  }
  return {
    set: true,
    value: Math.min(
      INACTIVITY_MONTHS_MAX,
      Math.max(INACTIVITY_MONTHS_MIN, Math.trunc(raw)),
    ),
  };
}

/**
 * Update de campanha do DONO da org (T6 rework, Fatia 6). Serve também o toggle
 * simples (`patch: { enabled }`).
 *
 * `trigger` NÃO é aceito: está estruturalmente ausente de `UpdateCampaignPatch`
 * e `CampaignMapper.toUpdateSet` só monta o SET a partir de cinco spreads
 * `!== undefined` — não há caminho para uma chave estranha chegar ao SQL, logo
 * nenhuma guarda de runtime é necessária.
 *
 * Double-check de owner + auditoria: mesmo molde do create. `changed` lista as
 * chaves do patch que de fato mudaram vs a entidade anterior. Para `body` o
 * critério é PRESENÇA da chave no patch (não diff de conteúdo): a ordem de
 * chaves do jsonb não é estável no round-trip do Postgres, então um diff de
 * conteúdo reportaria mudança espúria. O conteúdo nunca entra no metadata.
 */
@Injectable()
export class UpdateCampaignUseCase {
  constructor(
    @Inject(CAMPAIGN_REPOSITORY)
    private readonly repo: ICampaignRepository,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
    private readonly auditService: AuditService,
    private readonly config: ConfigService,
  ) {}

  async execute(input: UpdateCampaignInput): Promise<Campaign> {
    const isOwner = await this.orgRepo.isOwner(input.orgId, input.authId);
    if (!isOwner) {
      throw new CampaignSettingsForbiddenException();
    }

    const existing = await this.repo.findByIdAndOrg(input.id, input.orgId);
    if (!existing) {
      throw new CampaignNotFoundException();
    }

    const imageSrcPrefix = campaignImageSrcPrefix(
      this.config.get<string>("SUPABASE_URL"),
    );
    const normalized = normalizePatch(existing, input.patch, imageSrcPrefix);

    const updated = await this.repo.update(input.id, input.orgId, normalized);
    if (!updated) {
      // Corrida com um delete concorrente entre o findByIdAndOrg e o update.
      throw new CampaignNotFoundException();
    }

    const changed = diffChanged(existing, normalized);

    await this.auditService.logByAuthId(input.authId, {
      orgId: input.orgId,
      action: "campaign_settings_updated",
      entityType: "campaign",
      entityId: updated.id,
      metadata: {
        operation: "updated",
        trigger: updated.trigger,
        campaignId: updated.id,
        changed,
      },
    });

    return updated;
  }
}

function normalizePatch(
  existing: Campaign,
  patch: UpdateCampaignPatch,
  imageSrcPrefix: string | undefined,
): UpdateCampaignPatch {
  const normalized: UpdateCampaignPatch = {};

  if (patch.name !== undefined) {
    normalized.name = patch.name.trim();
  }
  if (patch.enabled !== undefined) {
    normalized.enabled = patch.enabled;
  }
  if (patch.subject !== undefined) {
    normalized.subject = normalizeSubject(patch.subject);
  }
  if (patch.body !== undefined) {
    normalized.body =
      patch.body === null
        ? null
        : validateCampaignBody(patch.body, { imageSrcPrefix });
  }
  if (patch.inactivityMonths !== undefined) {
    const resolved = resolveInactivityMonths(
      existing.trigger,
      patch.inactivityMonths,
    );
    if (resolved.set) {
      normalized.inactivityMonths = resolved.value;
    }
  }

  return normalized;
}

function diffChanged(
  existing: Campaign,
  normalized: UpdateCampaignPatch,
): string[] {
  const changed: string[] = [];
  if (normalized.name !== undefined && normalized.name !== existing.name) {
    changed.push("name");
  }
  if (
    normalized.enabled !== undefined &&
    normalized.enabled !== existing.enabled
  ) {
    changed.push("enabled");
  }
  if (
    normalized.subject !== undefined &&
    normalized.subject !== existing.subject
  ) {
    changed.push("subject");
  }
  if (normalized.body !== undefined) {
    changed.push("body");
  }
  if (
    normalized.inactivityMonths !== undefined &&
    normalized.inactivityMonths !== existing.inactivityMonths
  ) {
    changed.push("inactivityMonths");
  }
  return changed;
}
