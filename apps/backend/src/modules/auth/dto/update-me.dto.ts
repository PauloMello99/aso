import {
  IsEmail,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  registerDecorator,
  ValidateIf,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

const ONBOARDING_SEEN_MAX_KEYS = 30;
const ONBOARDING_SEEN_KEY_PATTERN = /^[a-z0-9/-]{1,32}$/;
const ONBOARDING_SEEN_MAX_VERSION = 1000;

export function isOnboardingSeenMap(value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const entries = Object.entries(value);
  if (entries.length > ONBOARDING_SEEN_MAX_KEYS) return false;
  return entries.every(
    ([key, version]) =>
      ONBOARDING_SEEN_KEY_PATTERN.test(key) &&
      typeof version === "number" &&
      Number.isInteger(version) &&
      version >= 1 &&
      version <= ONBOARDING_SEEN_MAX_VERSION,
  );
}

@ValidatorConstraint({ name: "isOnboardingSeenMap", async: false })
class IsOnboardingSeenMapConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return isOnboardingSeenMap(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} deve ser um mapa com no máximo ${ONBOARDING_SEEN_MAX_KEYS} chaves (a-z, 0-9, hífen, barra; 1-32 caracteres) e valores inteiros de 1 a ${ONBOARDING_SEEN_MAX_VERSION}`;
  }
}

function IsOnboardingSeenMap(validationOptions?: ValidationOptions) {
  return function (target: object, propertyName: string): void {
    registerDecorator({
      target: target.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsOnboardingSeenMapConstraint,
    });
  };
}

export class UpdateMeDto {
  @IsString()
  @IsOptional()
  @MaxLength(120)
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string | null;

  @IsOptional()
  @IsISO8601()
  onboardingCompletedAt?: string | null;

  // ValidateIf (não IsOptional): null deve ser rejeitado com 400, só undefined é omissão.
  @ValidateIf((o: UpdateMeDto) => o.onboardingSeen !== undefined)
  @IsOnboardingSeenMap()
  onboardingSeen?: Record<string, number>;
}
