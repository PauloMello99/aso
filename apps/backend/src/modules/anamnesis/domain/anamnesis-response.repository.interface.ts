import type { AnamnesisQuestion } from "./anamnesis-question";
import type {
  AnamnesisAnswer,
  AnamnesisResponseEntity,
} from "./anamnesis-response.entity";

export const ANAMNESIS_RESPONSE_REPOSITORY = Symbol(
  "ANAMNESIS_RESPONSE_REPOSITORY",
);

export interface CreateAnamnesisResponseData {
  orgId: string;
  formVersionId: string;
  serviceTypeId: string;
  customerId: string;
  questionsSnapshot: AnamnesisQuestion[];
  createdBy: string | null;
}

/**
 * Resposta + nome e e-mail do cliente, resolvidos pelo token público.
 * `customerEmail` é dado SERVER-SIDE ONLY — o use-case de lookup público
 * (`GetAnamnesisResponseByTokenUseCase`) NUNCA deve incluí-lo no DTO
 * retornado ao cliente; é usado só para o e-mail best-effort de cópia do PDF
 * assinado, após o envio.
 */
export type AnamnesisResponseWithCustomerName = AnamnesisResponseEntity & {
  customerName: string;
  customerEmail: string;
};

export interface MarkSubmittedData {
  answers: AnamnesisAnswer[];
  signerFullName: string;
  signerCpf: string | null;
  signatureStoragePath: string;
  pdfStoragePath: string;
  pdfHashSha256: string;
  requestIp: string | null;
  requestUserAgent: string | null;
}

export interface IAnamnesisResponseRepository {
  /** Ator autenticado envia o convite. RLS-enforced (DRIZZLE). */
  create(
    data: CreateAnamnesisResponseData,
  ): Promise<AnamnesisResponseEntity>;

  /**
   * Dedupe: remove convites pendentes anteriores pro mesmo par cliente/tipo de
   * serviço antes de criar um novo. Roda pré-membership em alguns fluxos →
   * bypassa RLS (DRIZZLE_ADMIN).
   */
  deletePendingFor(
    customerId: string,
    serviceTypeId: string,
    orgId: string,
  ): Promise<void>;

  /**
   * Compensação: remove a resposta se o e-mail de convite falhar. Bypassa RLS
   * (DRIZZLE_ADMIN) — mesma saga do `InviteMemberUseCase`.
   */
  delete(id: string): Promise<void>;

  /**
   * Resolve pelo token do link público — o cliente ainda não é membro
   * autenticado da org. Bypassa RLS (DRIZZLE_ADMIN).
   */
  findByToken(
    token: string,
  ): Promise<AnamnesisResponseWithCustomerName | null>;

  /**
   * Única mutação pós-insert: marca como enviada e grava a assinatura
   * eletrônica (assinante, artefatos de storage, hash de integridade,
   * proveniência da requisição). Sem ator autenticado no fluxo público →
   * roda via DRIZZLE_ADMIN. `WHERE status='pending'` é a proteção contra
   * dupla submissão — retorna `false` (0 linhas afetadas) quando outra
   * requisição concorrente já submeteu primeiro, para o use-case detectar a
   * corrida e não reportar sucesso sobre um upload que foi sobrescrito.
   */
  markSubmitted(id: string, data: MarkSubmittedData): Promise<boolean>;

  /** Consulta autenticada (ex.: tela do atendimento). RLS-enforced (DRIZZLE). */
  findById(id: string, orgId: string): Promise<AnamnesisResponseEntity | null>;

  /**
   * Respostas `submitted` do par cliente/tipo de serviço ainda não vinculadas a
   * nenhum `services.anamnesis_response_id`. RLS-enforced (DRIZZLE).
   */
  findLinkable(
    customerId: string,
    serviceTypeId: string,
    orgId: string,
  ): Promise<AnamnesisResponseEntity[]>;
}
