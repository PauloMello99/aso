import { afterEach, describe, expect, it, vi } from "vitest"
import { fetchAddressByCep } from "./viacep"

describe("fetchAddressByCep", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns the mapped address for a valid cep", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          logradouro: "Avenida Paulista",
          localidade: "São Paulo",
          uf: "SP",
        }),
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await fetchAddressByCep("01310100")

    expect(result).toEqual({
      address: "Avenida Paulista",
      city: "São Paulo",
      state: "SP",
    })
    expect(result).not.toHaveProperty("number")
  })

  it("strips non-digit characters before building the request url", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          logradouro: "Avenida Paulista",
          localidade: "São Paulo",
          uf: "SP",
        }),
    })
    vi.stubGlobal("fetch", fetchMock)

    await fetchAddressByCep("01310-100")

    expect(fetchMock).toHaveBeenCalledWith(
      "https://viacep.com.br/ws/01310100/json/",
    )
  })

  it("returns null without calling fetch when cep is invalid", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    const result = await fetchAddressByCep("123")

    expect(result).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("returns null when ViaCEP responds with erro: true", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ erro: true }),
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await fetchAddressByCep("00000000")

    expect(result).toBeNull()
  })

  it("returns null when fetch rejects", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network error"))
    vi.stubGlobal("fetch", fetchMock)

    const result = await fetchAddressByCep("01310100")

    expect(result).toBeNull()
  })
})
