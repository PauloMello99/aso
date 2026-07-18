import type { OrgRole } from "./org.entity";
import type { InvitationEntity } from "./invitation.entity";

export const INVITATION_REPOSITORY = Symbol("INVITATION_REPOSITORY");

export interface CreateInvitationData {
  orgId: string;
  invitedBy: string;
  email: string;
  role: OrgRole;
}

export interface InvitationWithOrg {
  invitation: InvitationEntity;
  orgName: string;
  orgSlug: string;
}

export interface IInvitationRepository {
  create(data: CreateInvitationData): Promise<InvitationEntity>;
  findPendingByOrg(orgId: string): Promise<InvitationEntity[]>;
  findById(id: string, orgId: string): Promise<InvitationEntity | null>;
  findByToken(token: string): Promise<InvitationWithOrg | null>;
  markAccepted(id: string): Promise<void>;
  cancel(id: string): Promise<void>;
  delete(id: string): Promise<void>;
}
