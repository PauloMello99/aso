import { assertPerformedAtNotFuture } from "./assert-performed-at-not-future";
import { ServicePerformedAtFutureException } from "../../domain/exceptions/service-performed-at-future.exception";

describe("assertPerformedAtNotFuture", () => {
  it("não lança quando performedAt não é informado", () => {
    expect(() => assertPerformedAtNotFuture(undefined)).not.toThrow();
  });

  it("não lança quando performedAt está no passado", () => {
    const yesterday = new Date(Date.now() - 86_400_000);

    expect(() => assertPerformedAtNotFuture(yesterday)).not.toThrow();
  });

  it("lança ServicePerformedAtFutureException quando performedAt está no futuro", () => {
    const tomorrow = new Date(Date.now() + 86_400_000);

    expect(() => assertPerformedAtNotFuture(tomorrow)).toThrow(
      ServicePerformedAtFutureException,
    );
  });
});
