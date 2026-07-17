import { IsIn } from "class-validator";

export class SetRsvpDto {
  @IsIn(["going", "not_going"])
  status!: "going" | "not_going";
}
