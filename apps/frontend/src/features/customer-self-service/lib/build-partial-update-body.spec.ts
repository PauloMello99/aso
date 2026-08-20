import { describe, expect, it } from "vitest"
import { buildPartialUpdateBody } from "./build-partial-update-body"
import type { CustomerUpdateFormValues } from "../schemas/customer-update.schemas"

const VALUES: CustomerUpdateFormValues = {
  name: "Maria Silva",
  email: "maria@example.com",
  phone: "+5511999999999",
  gender: "",
  birthDate: "1990-01-01",
  address: "Rua A",
  addressLine2: "",
  number: "123",
  city: "São Paulo",
  state: "SP",
  postalCode: "01310-100",
  country: "BR",
}

describe("buildPartialUpdateBody", () => {
  it("omite todas as chaves quando nada foi tocado", () => {
    const body = buildPartialUpdateBody({}, VALUES)
    expect(body).toEqual({})
  })

  it("nunca inclui gender quando o campo não foi tocado, mesmo vazio", () => {
    const body = buildPartialUpdateBody({ name: true }, VALUES)
    expect(body).toHaveProperty("name", "Maria Silva")
    expect(body).not.toHaveProperty("gender")
  })

  it("inclui apenas os campos marcados como dirty", () => {
    const body = buildPartialUpdateBody(
      { email: true, city: true },
      { ...VALUES, email: "novo@example.com", city: "Rio de Janeiro" },
    )
    expect(body).toEqual({ email: "novo@example.com", city: "Rio de Janeiro" })
  })

  it("converte gender tocado e vazio para null (limpar valor)", () => {
    const body = buildPartialUpdateBody({ gender: true }, { ...VALUES, gender: "" })
    expect(body.gender).toBeNull()
  })

  it("converte gender tocado e preenchido para o valor tipado", () => {
    const body = buildPartialUpdateBody(
      { gender: true },
      { ...VALUES, gender: "female" },
    )
    expect(body.gender).toBe("female")
  })

  it("converte campos nullable tocados e vazios para null", () => {
    const body = buildPartialUpdateBody(
      { phone: true, addressLine2: true, postalCode: true, country: true },
      { ...VALUES, phone: "", addressLine2: "", postalCode: "", country: "" },
    )
    expect(body).toEqual({
      phone: null,
      addressLine2: null,
      postalCode: null,
      country: null,
    })
  })

  it("nunca envia undefined explícito para campos não tocados", () => {
    const body = buildPartialUpdateBody({ name: true }, VALUES)
    expect(Object.keys(body)).toEqual(["name"])
  })
})
