import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  ICustomerSelfRegistrationRepository,
  CUSTOMER_SELF_REGISTRATION_REPOSITORY,
} from "../../domain/customer-self-registration.repository.interface";
import { CustomerSelfRegistrationNotFoundException } from "../../domain/exceptions/customer-self-registration-not-found.exception";
import { CustomerSelfRegistrationAlreadySubmittedException } from "../../domain/exceptions/customer-self-registration-already-submitted.exception";
import { CustomerSelfRegistrationExpiredException } from "../../domain/exceptions/customer-self-registration-expired.exception";
import {
  IPublicCustomerWriter,
  PUBLIC_CUSTOMER_WRITER,
  type PublicCustomerCoreCreate,
} from "../../domain/ports/public-customer-writer.port";
import {
  IAnamnesisResponseRepository,
  ANAMNESIS_RESPONSE_REPOSITORY,
} from "../../../anamnesis/domain/anamnesis-response.repository.interface";
import type { AnamnesisAnswer } from "../../../anamnesis/domain/anamnesis-response.entity";
import { SubmitAnamnesisResponseUseCase } from "../../../anamnesis/application/use-cases/submit-anamnesis-response.use-case";
import { AuditService } from "../../../audit/audit.service";

/**
 * Dados cadastrais que o caminho público pode preencher/atualizar. `email` NUNCA
 * entra aqui — vem sempre do registro de convite (resolvido por token), nunca do
 * corpo da requisição (o cenário 1 já validou na criação do convite que aquele
 * e-mail não pertence a um customer existente).
 */
export type SubmitCustomerSelfRegistrationCustomerData = Omit<
  PublicCustomerCoreCreate,
  "email"
>;

export interface SubmitCustomerSelfRegistrationInput
  extends SubmitCustomerSelfRegistrationCustomerData {
  token: string;
  answers: AnamnesisAnswer[];
  signerFullName: string;
  signerCpf: string | null;
  signatureImageBase64: string;
  consentAccepted: boolean;
  consentVersion: string;
  requestIp: string | null;
  requestUserAgent: string | null;
}

export interface SubmitCustomerSelfRegistrationResult {
  customerId: string;
}

@Injectable()
export class SubmitCustomerSelfRegistrationUseCase {
  private readonly logger = new Logger(
    SubmitCustomerSelfRegistrationUseCase.name,
  );

  constructor(
    @Inject(CUSTOMER_SELF_REGISTRATION_REPOSITORY)
    private readonly selfRegRepo: ICustomerSelfRegistrationRepository,
    @Inject(PUBLIC_CUSTOMER_WRITER)
    private readonly publicCustomerWriter: IPublicCustomerWriter,
    @Inject(ANAMNESIS_RESPONSE_REPOSITORY)
    private readonly anamnesisResponseRepo: IAnamnesisResponseRepository,
    private readonly submitAnamnesis: SubmitAnamnesisResponseUseCase,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    input: SubmitCustomerSelfRegistrationInput,
  ): Promise<SubmitCustomerSelfRegistrationResult> {
    const {
      token,
      answers,
      signerFullName,
      signerCpf,
      signatureImageBase64,
      consentAccepted,
      consentVersion,
      requestIp,
      requestUserAgent,
      ...customerData
    } = input;

    const registration = await this.selfRegRepo.findByToken(token);
    if (!registration) {
      throw new CustomerSelfRegistrationNotFoundException(token);
    }
    if (registration.displayStatus === "submitted") {
      throw new CustomerSelfRegistrationAlreadySubmittedException();
    }
    if (registration.isExpired) {
      throw new CustomerSelfRegistrationExpiredException();
    }

    // `registration.customerId` é o marcador de progresso de uma tentativa
    // anterior deste mesmo convite — tem prioridade sobre o lookup por e-mail
    // porque o e-mail do customer pode ter mudado entre tentativas (ex.: via
    // cenário 3, atualização cadastral). Usar só o e-mail como critério faria uma
    // retentativa após troca de e-mail criar um SEGUNDO customer. A FK composta
    // `(customer_id, org_id) -> customers(id, org_id)` (migration 0052) garante que
    // o marcador nunca aponta cross-org, e `ON DELETE SET NULL` faz o marcador
    // voltar a null se o customer for apagado, caindo de volta no fallback por
    // e-mail — que também cobre a primeira tentativa, quando `customerId` ainda é
    // null (o cenário 1 já garante que o e-mail não pertencia a nenhum customer no
    // momento da criação do convite; um customer achado por e-mail depois é retry).
    const targetId =
      registration.customerId ??
      (
        await this.publicCustomerWriter.findByEmailInOrg(
          registration.orgId,
          registration.email,
        )
      )?.id;

    const customer = targetId
      ? await this.publicCustomerWriter.updateCoreFields(
          targetId,
          registration.orgId,
          customerData,
        )
      : await this.publicCustomerWriter.createForOrg(registration.orgId, {
          ...customerData,
          email: registration.email,
        });

    if (!customer) {
      this.logger.error(
        `updateCoreFields não encontrou o customer ${targetId} na org ${registration.orgId} (registration ${registration.id})`,
      );
      throw new Error(
        `Failed to update customer ${targetId} during self-registration submit`,
      );
    }

    // Persistido IMEDIATAMENTE, antes de delegar à anamnese: é o marcador de
    // progresso que torna a retentativa segura em caso de falha logo em seguida.
    await this.selfRegRepo.linkCustomer(registration.id, customer.id);

    if (registration.anamnesisResponseId) {
      // Precisa acontecer ANTES do submit de anamnese: `findByToken` da anamnese faz
      // LEFT JOIN em customers, então sem este link a cópia assinada por e-mail é
      // pulada (a resposta chega a ser marcada como submitted, mas sem e-mail do
      // customer associado).
      await this.anamnesisResponseRepo.linkCustomer(
        registration.anamnesisResponseId,
        customer.id,
        registration.orgId,
      );
    }

    if (registration.anamnesisToken) {
      // Exceções propagam sem captura de propósito: os passos acima já são
      // idempotentes (criação/atualização do customer + linkCustomer), então uma
      // segunda tentativa após falha de validação da anamnese apenas re-executa
      // esses passos como no-op/update e cai de novo aqui.
      await this.submitAnamnesis.execute({
        token: registration.anamnesisToken,
        answers,
        signerFullName,
        signerCpf,
        signatureImageBase64,
        consentAccepted,
        consentVersion,
        requestIp,
        requestUserAgent,
      });
    }

    const marked = await this.selfRegRepo.markSubmitted(
      registration.id,
      customer.id,
    );
    if (!marked) {
      // Não propaga: o trabalho durável (customer criado/atualizado, anamnese
      // submetida) já ocorreu. Uma eventual segunda tentativa vai bater em
      // AlreadySubmitted do lado da anamnese, o que é aceitável.
      this.logger.error(
        `markSubmitted não encontrou registro pending para ${registration.id} (customer ${customer.id}) — provável corrida com outra tentativa`,
      );
    }

    await this.auditService.log({
      actorId: null,
      orgId: registration.orgId,
      action: "customer_self_registered",
      entityType: "customer",
      entityId: customer.id,
      metadata: {
        registrationId: registration.id,
        serviceTypeId: registration.serviceTypeId,
      },
    });

    return { customerId: customer.id };
  }
}
