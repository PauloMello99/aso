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

/** Resposta + primeiro nome do cliente, resolvidos pelo token público. */
export type AnamnesisResponseWithCustomerName = AnamnesisResponseEntity & {
  customerName: string;
};

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
   * Única mutação pós-insert: marca como enviada. Sem ator autenticado no
   * fluxo público → roda via DRIZZLE_ADMIN.
   */
  markSubmitted(id: string, answers: AnamnesisAnswer[]): Promise<void>;

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
