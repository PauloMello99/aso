import type { OrgRole } from "./org.entity";
import type { InvitationEntity } from "./invitation.entity";

export const INVITATION_REPOSITORY = Symbol("INVITATION_REPOSITORY");

export interface CreateInvitationData {
  orgId: string;
  invitedBy: string; // userId of the owner
  email: string;
  role: OrgRole;
}

/** Convite + dados da org (para a tela de aceite, resolvido por token). */
export interface InvitationWithOrg {
  invitation: InvitationEntity;
  orgName: string;
  orgSlug: string;
}

export interface IInvitationRepository {
  create(data: CreateInvitationData): Promise<InvitationEntity>;
  findPendingByOrg(orgId: string): Promise<InvitationEntity[]>;
  findById(id: string, orgId: string): Promise<InvitationEntity | null>;
  /** Resolve um convite pelo token (com nome/slug da org). Bypassa RLS. */
  findByToken(token: string): Promise<InvitationWithOrg | null>;
  /** Marca o convite como aceito (status accepted + accepted_at). */
  markAccepted(id: string): Promise<void>;
  cancel(id: string): Promise<void>;
  /** Remove o convite (recusa pelo convidado → permite reenviar o fluxo). Bypassa RLS. */
  delete(id: string): Promise<void>;
}
