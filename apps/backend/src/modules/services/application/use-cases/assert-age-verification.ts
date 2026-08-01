import type { ServiceTypeEntity } from "../../domain/service-type.entity";
import type { CustomerEntity } from "../../../customers/domain/customer.entity";
import { ServiceAgeVerificationRequiredException } from "../../domain/exceptions/service-age-verification-required.exception";

function calculateAge(birthDate: string, at: Date): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  let age = at.getUTCFullYear() - year;
  const atMonth = at.getUTCMonth() + 1;
  const atDay = at.getUTCDate();
  if (atMonth < month || (atMonth === month && atDay < day)) {
    age--;
  }
  return age;
}

export function assertAgeVerification(
  serviceType: ServiceTypeEntity | null,
  customer: CustomerEntity | null,
  performedAt: Date,
): void {
  if (serviceType?.requiresAgeVerification !== true) return;

  if (!customer?.birthDate) {
    throw new ServiceAgeVerificationRequiredException();
  }

  const age = calculateAge(customer.birthDate, performedAt);
  if (age === null || age < 18) {
    throw new ServiceAgeVerificationRequiredException();
  }
}
