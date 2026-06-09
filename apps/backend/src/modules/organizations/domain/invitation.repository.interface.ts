import type { OrgRole } from "./org.entity";
import type { InvitationEntity } from "./invitation.entity";

export const INVITATION_REPOSITORY = Symbol("INVITATION_REPOSITORY");

export interface CreateInvitationData {
  orgId: string;
  invitedBy: string; // userId of the owner
  email: string;
  role: OrgRole;
}

export interface IInvitationRepository {
  create(data: CreateInvitationData): Promise<InvitationEntity>;
  findPendingByOrg(orgId: string): Promise<InvitationEntity[]>;
  findById(id: string, orgId: string): Promise<InvitationEntity | null>;
  cancel(id: string): Promise<void>;
}
