import { beforeAll, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { addYears, format } from "date-fns"
import { DatePicker } from "./date-picker"

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === "undefined") {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
  }
})

describe("DatePicker", () => {
  it("defaults endMonth to today, blocking navigation to the next month", async () => {
    const user = userEvent.setup()
    const today = format(new Date(), "yyyy-MM-dd")

    render(<DatePicker value={today} onChange={vi.fn()} />)

    await user.click(screen.getByRole("button"))

    const nextButton = await screen.findByLabelText(/next month/i)
    expect(nextButton).toHaveAttribute("aria-disabled", "true")
  })

  it("allows navigating past the current month when a custom endMonth is passed", async () => {
    const user = userEvent.setup()
    const today = format(new Date(), "yyyy-MM-dd")

    render(
      <DatePicker
        value={today}
        onChange={vi.fn()}
        endMonth={addYears(new Date(), 2)}
      />,
    )

    await user.click(screen.getByRole("button"))

    const nextButton = await screen.findByLabelText(/next month/i)
    expect(nextButton).not.toHaveAttribute("aria-disabled", "true")
  })
})
