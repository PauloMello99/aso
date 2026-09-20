import { describe, expect, it } from "vitest"
import { renderHook } from "@testing-library/react"
import { useStickyOption } from "./use-async-options"

interface Option {
  id: string
  label: string
}

function getId(o: Option): string {
  return o.id
}

describe("useStickyOption", () => {
  it("keeps the selected option visible after it drops out of the current search results", () => {
    const { result, rerender } = renderHook(
      ({ options, value }: { options: Option[]; value: string | undefined }) =>
        useStickyOption(options, value, getId),
      {
        initialProps: {
          options: [
            { id: "1", label: "Alice" },
            { id: "2", label: "Bob" },
          ],
          value: "2" as string | undefined,
        },
      },
    )

    expect(result.current).toEqual({ id: "2", label: "Bob" })

    // Usuário digita uma busca que não bate mais com "Bob" — a API encolhe
    // o resultado, mas a seleção não pode "sumir" visualmente.
    rerender({ options: [{ id: "3", label: "Carol" }], value: "2" })

    expect(result.current).toEqual({ id: "2", label: "Bob" })
  })

  it("returns the seed immediately while options are still empty (edit mode, cold query)", () => {
    const seed: Option = { id: "9", label: "Cliente seedado" }

    const { result } = renderHook(
      ({
        options,
        value,
        initialOption,
      }: {
        options: Option[]
        value: string | undefined
        initialOption: Option
      }) => useStickyOption(options, value, getId, initialOption),
      {
        initialProps: { options: [] as Option[], value: "9", initialOption: seed },
      },
    )

    expect(result.current).toEqual(seed)
  })

  it("replaces a stale seed with the resolved option once it appears in the results", () => {
    const seed: Option = { id: "9", label: "Cliente seedado" }

    const { result, rerender } = renderHook(
      ({
        options,
        value,
        initialOption,
      }: {
        options: Option[]
        value: string | undefined
        initialOption: Option
      }) => useStickyOption(options, value, getId, initialOption),
      {
        initialProps: { options: [] as Option[], value: "9", initialOption: seed },
      },
    )

    expect(result.current).toEqual(seed)

    rerender({
      options: [{ id: "9", label: "Cliente real" }],
      value: "9",
      initialOption: seed,
    })

    expect(result.current).toEqual({ id: "9", label: "Cliente real" })
  })

  it("swaps the seed when switching to a different record before its query resolves", () => {
    const seedA: Option = { id: "1", label: "Registro A" }
    const seedB: Option = { id: "2", label: "Registro B" }

    const { result, rerender } = renderHook(
      ({
        options,
        value,
        initialOption,
      }: {
        options: Option[]
        value: string | undefined
        initialOption: Option
      }) => useStickyOption(options, value, getId, initialOption),
      {
        initialProps: { options: [] as Option[], value: "1", initialOption: seedA },
      },
    )

    expect(result.current).toEqual(seedA)

    rerender({ options: [], value: "2", initialOption: seedB })

    expect(result.current).toEqual(seedB)
  })

  it("clears the remembered option once value becomes empty", () => {
    const { result, rerender } = renderHook(
      ({ options, value }: { options: Option[]; value: string | undefined }) =>
        useStickyOption(options, value, getId),
      {
        initialProps: {
          options: [{ id: "1", label: "Alice" }],
          value: "1" as string | undefined,
        },
      },
    )

    expect(result.current).toEqual({ id: "1", label: "Alice" })

    rerender({ options: [], value: undefined })

    expect(result.current).toBeUndefined()
  })
})
