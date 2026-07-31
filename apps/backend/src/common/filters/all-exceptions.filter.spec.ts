import { ArgumentsHost } from "@nestjs/common";
import { AllExceptionsFilter } from "./all-exceptions.filter";
import { TelemetryService } from "../telemetry/telemetry.service";
import { DomainException } from "../exceptions/domain.exception";

class FakeDomainException extends DomainException {
  readonly code = "INSUFFICIENT_STOCK";
}

function buildHost(): { host: ArgumentsHost; json: jest.Mock } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };
  const request = { url: "/services", method: "POST" };

  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;

  return { host, json };
}

describe("AllExceptionsFilter", () => {
  function buildFilter(): AllExceptionsFilter {
    const telemetry = {
      captureException: jest.fn(),
    } as unknown as jest.Mocked<TelemetryService>;
    return new AllExceptionsFilter(telemetry);
  }

  it("inclui details no corpo quando a DomainException os expõe (N7)", () => {
    const filter = buildFilter();
    const { host, json } = buildHost();
    const exception = new FakeDomainException(
      "Insufficient stock for the requested material",
      { materialId: "material-1", available: "1", requested: "5" },
    );

    filter.catch(exception, host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "INSUFFICIENT_STOCK",
        details: { materialId: "material-1", available: "1", requested: "5" },
      }),
    );
  });

  it("omite o campo details quando a DomainException não os expõe", () => {
    const filter = buildFilter();
    const { host, json } = buildHost();
    const exception = new FakeDomainException("Some generic domain error");

    filter.catch(exception, host);

    const body = json.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(body).not.toHaveProperty("details");
  });
});
