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
import { CashierForbiddenException } from "../../domain/exceptions/cashier-forbidden.exception";
import { MemberPaymentNotFoundException } from "../../domain/exceptions/member-payment-not-found.exception";
import { PaymentMemberNotFoundException } from "../../domain/exceptions/payment-member-not-found.exception";
import {
  IMemberDocumentGenerator,
  MEMBER_DOCUMENT_GENERATOR,
} from "../../domain/ports/member-document-generator.port";
import { buildReceiptModel } from "../../domain/build-member-document-models";
import { receiptFilename } from "../../domain/member-document-filename";
import { resolveActor } from "./resolve-actor";

export interface GetMemberPaymentReceiptInput {
  orgId: string;
  authId: string;
  /** Beneficiario vindo da rota (users.id), nao do body. */
  targetUserId: string;
  paymentId: string;
}

export interface MemberDocumentFile {
  buffer: Buffer;
  filename: string;
}

@Injectable()
export class GetMemberPaymentReceiptUseCase {
  constructor(
    @Inject(MEMBER_PAYMENT_REPOSITORY)
    private readonly memberPaymentRepo: IMemberPaymentRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
    @Inject(MEMBER_DOCUMENT_GENERATOR)
    private readonly generator: IMemberDocumentGenerator,
  ) {}

  async execute(
    input: GetMemberPaymentReceiptInput,
  ): Promise<MemberDocumentFile> {
    const { userId: currentUserId, isOwner } = await resolveActor(
      this.memberRepo,
      input.orgId,
      input.authId,
    );

    if (!isOwner && input.targetUserId !== currentUserId) {
      throw new CashierForbiddenException();
    }

    const members = await this.memberRepo.findAllByOrg(input.orgId);
    const beneficiary = members.find(
      (member) => member.userId === input.targetUserId,
    );
    if (!beneficiary) {
      throw new PaymentMemberNotFoundException(input.targetUserId);
    }

    // A consulta ja e escopada por (orgId, userId): pagamento de outra org ou
    // de outro membro nao aparece aqui e vira 404. Estorno em si nao tem recibo.
    const payments = await this.memberPaymentRepo.findAllByOrgAndUser(
      input.orgId,
      input.targetUserId,
    );
    const found = payments.find(({ entity }) => entity.id === input.paymentId);
    if (!found || found.entity.isReversal) {
      throw new MemberPaymentNotFoundException(input.paymentId);
    }

    const [reversedIds, org] = await Promise.all([
      this.memberPaymentRepo.findReversedIds(input.orgId),
      this.orgRepo.findByIdAndAuthId(input.orgId, input.authId),
    ]);
    if (!org) throw new OrgNotFoundException(input.orgId);

    const issuedAt = new Date();
    const model = buildReceiptModel({
      studioName: org.name,
      memberName: beneficiary.userName,
      memberEmail: beneficiary.userEmail,
      payment: found.entity,
      paymentMethod: found.paymentMethod,
      reversed: reversedIds.has(found.entity.id),
      reversal:
        payments.find(
          ({ entity }) => entity.reversesPaymentId === found.entity.id,
        )?.entity ?? null,
      issuedAt,
    });

    return {
      buffer: await this.generator.generateReceipt(model),
      filename: receiptFilename(beneficiary.userName, issuedAt, found.entity.id),
    };
  }
}
