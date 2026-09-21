import { Inject, Injectable } from "@nestjs/common";
import {
  IMemberPaymentRepository,
  MEMBER_PAYMENT_REPOSITORY,
} from "../../domain/member-payment.repository.interface";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../../organizations/domain/member.repository.interface";
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from "../../../organizations/domain/org.repository.interface";
import { OrgNotFoundException } from "../../../organizations/domain/exceptions/org-not-found.exception";
import {
  IServiceRepository,
  SERVICE_REPOSITORY,
} from "../../../services/domain/service.repository.interface";
import { CashierForbiddenException } from "../../domain/exceptions/cashier-forbidden.exception";
import { PaymentMemberNotFoundException } from "../../domain/exceptions/payment-member-not-found.exception";
import {
  IMemberDocumentGenerator,
  MEMBER_DOCUMENT_GENERATOR,
} from "../../domain/ports/member-document-generator.port";
import { buildReportModel } from "../../domain/build-member-document-models";
import { reportFilename } from "../../domain/member-document-filename";
import { parseReportPeriod } from "../../domain/report-period";
import { resolveActor } from "./resolve-actor";
import type { MemberDocumentFile } from "./get-member-payment-receipt.use-case";

export interface GetMemberReportInput {
  orgId: string;
  authId: string;
  /** Membro do relatorio (users.id) — vem da rota, nao do body. */
  targetUserId: string;
  /** YYYY-MM-DD; `unknown` porque vem cru da query (validado em parseReportPeriod). */
  from: unknown;
  to: unknown;
}

@Injectable()
export class GetMemberReportUseCase {
  constructor(
    @Inject(MEMBER_PAYMENT_REPOSITORY)
    private readonly memberPaymentRepo: IMemberPaymentRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepo: IServiceRepository,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
    @Inject(MEMBER_DOCUMENT_GENERATOR)
    private readonly generator: IMemberDocumentGenerator,
  ) {}

  async execute(input: GetMemberReportInput): Promise<MemberDocumentFile> {
    const { userId: currentUserId, isOwner } = await resolveActor(
      this.memberRepo,
      input.orgId,
      input.authId,
    );

    if (!isOwner && input.targetUserId !== currentUserId) {
      throw new CashierForbiddenException();
    }

    const period = parseReportPeriod(input.from, input.to);

    const members = await this.memberRepo.findAllByOrg(input.orgId);
    const beneficiary = members.find(
      (member) => member.userId === input.targetUserId,
    );
    if (!beneficiary) {
      throw new PaymentMemberNotFoundException(input.targetUserId);
    }

    // performedBy e SEMPRE o targetUserId resolvido (nunca null: null agregaria
    // a org inteira e vazaria comissao de outros membros). Bruta/taxas vem do
    // snapshot de transactions.fee_cents e a comissao do snapshot em services —
    // as mesmas consultas do saldo devido, so que com janela do periodo.
    const [org, services, payments, reversedIds, commissionCents, totals] =
      await Promise.all([
        this.orgRepo.findByIdAndAuthId(input.orgId, input.authId),
        this.serviceRepo.findAllByOrg(input.orgId, {
          performedBy: input.targetUserId,
          from: period.from,
          to: period.to,
        }),
        this.memberPaymentRepo.findAllByOrgAndUser(
          input.orgId,
          input.targetUserId,
        ),
        this.memberPaymentRepo.findReversedIds(input.orgId),
        this.serviceRepo.commissionCentsByPeriod(
          input.orgId,
          period.from,
          period.to,
          input.targetUserId,
        ),
        this.serviceRepo.memberTotalsByPeriod(
          input.orgId,
          period.from,
          period.to,
          input.targetUserId,
        ),
      ]);
    if (!org) throw new OrgNotFoundException(input.orgId);

    const periodPayments = payments
      .map(({ entity }) => entity)
      .filter(
        (entity) =>
          entity.createdAt.getTime() >= period.from.getTime() &&
          entity.createdAt.getTime() <= period.to.getTime(),
      );

    const model = buildReportModel({
      studioName: org.name,
      memberName: beneficiary.userName,
      memberEmail: beneficiary.userEmail,
      periodFrom: period.fromDate,
      periodTo: period.toDate,
      issuedAt: new Date(),
      services,
      payments: periodPayments,
      reversedPaymentIds: reversedIds,
      grossRevenueCents: totals.grossRevenueCents,
      feesCents: totals.feesCents,
      commissionCents,
    });

    return {
      buffer: await this.generator.generateReport(model),
      filename: reportFilename(
        beneficiary.userName,
        period.fromDate,
        period.toDate,
      ),
    };
  }
}
