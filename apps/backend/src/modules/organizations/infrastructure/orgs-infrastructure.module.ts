import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../database/database.module";
import { ORGANIZATION_REPOSITORY } from "../domain/org.repository.interface";
import { MEMBER_REPOSITORY } from "../domain/member.repository.interface";
import { INVITATION_REPOSITORY } from "../domain/invitation.repository.interface";
import { DrizzleOrgRepository } from "./persistence/drizzle-org.repository";
import { DrizzleMemberRepository } from "./persistence/drizzle-member.repository";
import { DrizzleInvitationRepository } from "./persistence/drizzle-invitation.repository";

@Module({
  imports: [DatabaseModule],
  providers: [
    { provide: ORGANIZATION_REPOSITORY, useClass: DrizzleOrgRepository },
    { provide: MEMBER_REPOSITORY, useClass: DrizzleMemberRepository },
    { provide: INVITATION_REPOSITORY, useClass: DrizzleInvitationRepository },
  ],
  exports: [ORGANIZATION_REPOSITORY, MEMBER_REPOSITORY, INVITATION_REPOSITORY],
})
export class OrgsInfrastructureModule {}
