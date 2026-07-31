import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@logtail/next", () => ({
  log: { error: vi.fn(), info: vi.fn() },
}))

import { apiRequest, ApiError } from "./client"

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response
}

function emptyResponse(status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.reject(new SyntaxError("Unexpected end of JSON input")),
    text: () => Promise.resolve(""),
  } as Response
}

describe("apiRequest", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns the parsed object for a 200 response with a valid JSON body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { id: "1" }))
    vi.stubGlobal("fetch", fetchMock)

    const result = await apiRequest<{ id: string }>("/anything", {
      skipAuth: true,
    })

    expect(result).toEqual({ id: "1" })
  })

  it("resolves undefined for a 200 response with an empty body instead of throwing", async () => {
    const fetchMock = vi.fn().mockResolvedValue(emptyResponse(200))
    vi.stubGlobal("fetch", fetchMock)

    const result = await apiRequest<void>("/orgs/org-1/calendar/events/e-1/rsvp", {
      method: "PUT",
      skipAuth: true,
    })

    expect(result).toBeUndefined()
  })

  it("resolves undefined for a 204 response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(emptyResponse(204))
    vi.stubGlobal("fetch", fetchMock)

    const result = await apiRequest<void>("/anything", { skipAuth: true })

    expect(result).toBeUndefined()
  })

  it("throws ApiError with message/status/code from a non-ok JSON body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(400, { message: "Dado inválido", code: "VALIDATION_ERROR" }),
    )
    vi.stubGlobal("fetch", fetchMock)

    await expect(
      apiRequest("/anything", { skipAuth: true }),
    ).rejects.toMatchObject({
      message: "Dado inválido",
      status: 400,
      code: "VALIDATION_ERROR",
    })
    await expect(
      apiRequest("/anything", { skipAuth: true }),
    ).rejects.toBeInstanceOf(ApiError)
  })

  it("throws ApiError carrying structured details from a non-ok JSON body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(422, {
        message: "Insufficient stock for the requested material",
        code: "INSUFFICIENT_STOCK",
        details: { materialId: "m-1", available: "0", requested: "1" },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    await expect(
      apiRequest("/anything", { skipAuth: true }),
    ).rejects.toMatchObject({
      code: "INSUFFICIENT_STOCK",
      details: { materialId: "m-1", available: "0", requested: "1" },
    })
  })

  it("throws ApiError with the default message when the non-ok response has an empty body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(emptyResponse(500))
    vi.stubGlobal("fetch", fetchMock)

    await expect(
      apiRequest("/anything", { skipAuth: true }),
    ).rejects.toMatchObject({
      message: "Request failed with status 500",
      status: 500,
    })
  })
})
