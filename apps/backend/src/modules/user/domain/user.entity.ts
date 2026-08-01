export type PlatformRole = "super_admin" | "user";
export type Gender = "male" | "female" | "other";

export interface UserEntityProps {
  id: string;
  authId: string;
  platformRole: PlatformRole;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  birthDate: string | null;
  gender: Gender | null;
  onboardingCompletedAt: Date | null;
  termsAcceptedAt: Date | null;
  termsVersion: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  authId: string;
  name: string;
  email: string;
  termsAcceptedAt?: Date;
  termsVersion?: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  avatarUrl?: string | null;
  onboardingCompletedAt?: Date | null;
}

export class UserEntity {
  readonly id: string;
  readonly authId: string;
  readonly platformRole: PlatformRole;
  readonly name: string;
  readonly email: string;
  readonly phone: string | null;
  readonly avatarUrl: string | null;
  readonly birthDate: string | null;
  readonly gender: Gender | null;
  readonly onboardingCompletedAt: Date | null;
  readonly termsAcceptedAt: Date | null;
  readonly termsVersion: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: UserEntityProps) {
    this.id = props.id;
    this.authId = props.authId;
    this.platformRole = props.platformRole;
    this.name = props.name;
    this.email = props.email;
    this.phone = props.phone;
    this.avatarUrl = props.avatarUrl;
    this.birthDate = props.birthDate;
    this.gender = props.gender;
    this.onboardingCompletedAt = props.onboardingCompletedAt;
    this.termsAcceptedAt = props.termsAcceptedAt;
    this.termsVersion = props.termsVersion;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: UserEntityProps): UserEntity {
    return new UserEntity(props);
  }
}
