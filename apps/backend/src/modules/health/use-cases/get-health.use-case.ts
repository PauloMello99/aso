import { Injectable } from "@nestjs/common";

@Injectable()
export class GetHealthUseCase {
  execute() {
    return { status: "ok" };
  }
}
