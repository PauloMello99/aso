export interface ViaCepAddress {
  address: string
  city: string
  state: string
}

interface ViaCepResponse {
  erro?: boolean
  logradouro?: string
  localidade?: string
  uf?: string
}

export async function fetchAddressByCep(
  cep: string,
): Promise<ViaCepAddress | null> {
  const cepDigits = cep.replace(/\D/g, "")

  if (cepDigits.length !== 8) {
    return null
  }

  try {
    const response = await fetch(
      `https://viacep.com.br/ws/${cepDigits}/json/`,
    )
    const data = (await response.json()) as ViaCepResponse

    if (data.erro) {
      return null
    }

    return {
      address: data.logradouro ?? "",
      city: data.localidade ?? "",
      state: data.uf ?? "",
    }
  } catch {
    return null
  }
}
