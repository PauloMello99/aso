import {
  Controller,
  Body,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { OrgMembershipGuard } from "../../auth/guards/org-membership.guard";
import { OrgModuleGuard } from "../../auth/guards/org-module.guard";
import { OrgOwnerGuard } from "../../auth/guards/org-owner.guard";
import { ActiveSubscriptionGuard } from "../../subscriptions/interface/guards/active-subscription.guard";
import { AllowAnyOrgMember } from "../../auth/decorators/require-module.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../organizations/domain/member.repository.interface";
import { PaymentMemberNotFoundException } from "../domain/exceptions/payment-member-not-found.exception";
import { CreateMemberPaymentUseCase } from "../application/use-cases/create-member-payment.use-case";
import { ListMemberPaymentsUseCase } from "../application/use-cases/list-member-payments.use-case";
import { GetMemberPaymentSummaryUseCase } from "../application/use-cases/get-member-payment-summary.use-case";
import { ReverseMemberPaymentUseCase } from "../application/use-cases/reverse-member-payment.use-case";
import { CorrectMemberPaymentUseCase } from "../application/use-cases/correct-member-payment.use-case";
import { GetMemberPaymentReceiptUseCase } from "../application/use-cases/get-member-payment-receipt.use-case";
import { GetMemberReportUseCase } from "../application/use-cases/get-member-report.use-case";
import type { MemberDocumentFile } from "../application/use-cases/get-member-payment-receipt.use-case";
import { CreateMemberPaymentDto } from "./dto/create-member-payment.dto";
import { MemberReportQueryDto } from "./dto/member-report-query.dto";

const DEFAULT_DESCRIPTION = "Pagamento a funcionário";

// :userId aqui e SEMPRE users.id (o BENEFICIARIO do pagamento) — diferente
// de orgs.controller.ts, que usa :memberId (id da org_membership). Os dois
// NAO sao intercambiaveis: nunca passe um id de membership para uma rota
// deste controller, nem o contrario.
//
// Controller separado do CashierController (que exige @RequireModule
// "cashier") porque o funcionario acessando a PROPRIA tela de pagamentos
// nao pode depender de permissao do modulo caixa — aqui basta ser membro
// habilitado da org (@AllowAnyOrgMember). Visibilidade por ator (funcionario
// so ve a propria linha, owner ve qualquer uma) e resolvida dentro dos
// use-cases via resolveActor.
@Controller("orgs/:orgId/members/:userId")
@UseGuards(AuthGuard, OrgMembershipGuard, OrgModuleGuard)
@AllowAnyOrgMember()
export class MemberPaymentsController {
  constructor(
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
    private readonly createMemberPayment: CreateMemberPaymentUseCase,
    private readonly listMemberPayments: ListMemberPaymentsUseCase,
    private readonly getMemberPaymentSummary: GetMemberPaymentSummaryUseCase,
    private readonly reverseMemberPayment: ReverseMemberPaymentUseCase,
    private readonly correctMemberPayment: CorrectMemberPaymentUseCase,
    private readonly getMemberPaymentReceipt: GetMemberPaymentReceiptUseCase,
    private readonly getMemberReport: GetMemberReportUseCase,
  ) {}

  private sendPdf(res: Response, file: MemberDocumentFile): void {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.filename}"`,
    );
    res.send(file.buffer);
  }

  // Confirma que :userId e de fato um membro habilitado da org ANTES de
  // qualquer leitura escopada por ator — sem isso, um uuid desconhecido
  // devolveria lista vazia/saldo zero (200) em vez de 404 (decisao do passo
  // 9, plano do Bloco 2). Inline no controller, NAO num guard: guards rodam
  // ANTES do RlsInterceptor abrir a claims context (RlsContext.runWithClaims
  // envolve next.handle(), que so dispara depois dos guards) — um guard
  // consultando MEMBER_REPOSITORY (DRIZZLE, RLS-scoped) veria zero linhas
  // sempre e bloquearia ate o owner com 404. O metodo do controller, por
  // rodar DENTRO de next.handle(), ja tem a claims context ativa.
  //
  // Aceita membro DESABILITADO de proposito (F11): so leitura (list/summary)
  // passa por aqui. O dinheiro de um pagamento ja feito ja saiu, e o owner
  // precisa enxergar o historico para ESTORNAR (reverse nao chama este
  // metodo nem exige enabled). Novo pagamento e correcao/relancamento seguem
  // exigindo membro habilitado em CreateMemberPaymentUseCase.
  private async ensureBeneficiary(
    orgId: string,
    userId: string,
  ): Promise<void> {
    const members = await this.memberRepo.findAllByOrg(orgId);
    const beneficiary = members.find((member) => member.userId === userId);
    if (!beneficiary) throw new PaymentMemberNotFoundException(userId);
  }

  @Get("payments")
  async list(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("userId", ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.ensureBeneficiary(orgId, userId);
    return this.listMemberPayments.execute({
      orgId,
      authId: user.id,
      targetUserId: userId,
    });
  }

  @Get("payment-summary")
  async summary(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("userId", ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.ensureBeneficiary(orgId, userId);
    return this.getMemberPaymentSummary.execute({
      orgId,
      authId: user.id,
      targetUserId: userId,
    });
  }

  // Autorizacao (owner qualquer membro; funcionario so o proprio) e existencia
  // do beneficiario sao resolvidas dentro do use-case (resolveActor).
  @Get("payments/:paymentId/receipt")
  async receipt(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("userId", ParseUUIDPipe) userId: string,
    @Param("paymentId", ParseUUIDPipe) paymentId: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.getMemberPaymentReceipt.execute({
      orgId,
      authId: user.id,
      targetUserId: userId,
      paymentId,
    });
    this.sendPdf(res, file);
  }

  @Get("report")
  async report(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("userId", ParseUUIDPipe) userId: string,
    @Query() query: MemberReportQueryDto,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.getMemberReport.execute({
      orgId,
      authId: user.id,
      targetUserId: userId,
      from: query.from,
      to: query.to,
    });
    this.sendPdf(res, file);
  }

  @Post("payments")
  @UseGuards(OrgOwnerGuard, ActiveSubscriptionGuard)
  async create(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("userId", ParseUUIDPipe) userId: string,
    @Body() dto: CreateMemberPaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.createMemberPayment.execute({
      orgId,
      authId: user.id,
      userId,
      amountCents: dto.amountCents,
      paymentMethod: dto.paymentMethod,
      description: dto.description ?? DEFAULT_DESCRIPTION,
      periodStart: dto.periodStart ?? null,
      periodEnd: dto.periodEnd ?? null,
    });
  }

  @Post("payments/:paymentId/reverse")
  @UseGuards(OrgOwnerGuard, ActiveSubscriptionGuard)
  async reverse(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("userId", ParseUUIDPipe) userId: string,
    @Param("paymentId", ParseUUIDPipe) paymentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reverseMemberPayment.execute({
      orgId,
      authId: user.id,
      paymentId,
      expectedUserId: userId,
    });
  }

  @Post("payments/:paymentId/correct")
  @UseGuards(OrgOwnerGuard, ActiveSubscriptionGuard)
  async correct(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("userId", ParseUUIDPipe) userId: string,
    @Param("paymentId", ParseUUIDPipe) paymentId: string,
    @Body() dto: CreateMemberPaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.correctMemberPayment.execute({
      orgId,
      authId: user.id,
      paymentId,
      expectedUserId: userId,
      amountCents: dto.amountCents,
      paymentMethod: dto.paymentMethod,
      description: dto.description ?? DEFAULT_DESCRIPTION,
      periodStart: dto.periodStart ?? null,
      periodEnd: dto.periodEnd ?? null,
    });
  }
}
