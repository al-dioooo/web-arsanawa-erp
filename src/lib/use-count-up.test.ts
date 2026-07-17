import { renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useCountUp } from "@/lib/use-count-up"
import { resetPrefersReducedMotion, setPrefersReducedMotion } from "@/test/reduced-motion"

const formatRounded = (n: number) => String(Math.round(n))

afterEach(() => {
    resetPrefersReducedMotion()
})

describe("useCountUp", () => {
    it("returns the final formatted value on first render (SSR-safe)", () => {
        const { result } = renderHook(() => useCountUp(1234, { formatter: formatRounded }))

        expect(result.current).toBe("1234")
    })

    it("animates from the previous value to the new one", async () => {
        const formatter = vi.fn(formatRounded)
        const { result, rerender } = renderHook(
            ({ value }) => useCountUp(value, { duration: 0.2, formatter }),
            { initialProps: { value: 0 } },
        )

        expect(result.current).toBe("0")

        rerender({ value: 100 })

        // The new target is reached by animation frames, not synchronously.
        expect(result.current).toBe("0")

        await waitFor(() => expect(result.current).toBe("100"))
    })

    it("passes raw numbers to the formatter", async () => {
        const formatter = vi.fn(formatRounded)
        const { result, rerender } = renderHook(
            ({ value }) => useCountUp(value, { duration: 0.2, formatter }),
            { initialProps: { value: 0 } },
        )

        rerender({ value: 50 })

        // On completion the hook snaps to the exact target value.
        await waitFor(() => expect(formatter).toHaveBeenLastCalledWith(50))
        expect(result.current).toBe("50")

        for (const [arg] of formatter.mock.calls) {
            expect(typeof arg).toBe("number")
            expect(Number.isFinite(arg)).toBe(true)
        }
    })

    it("snaps straight to the final value under reduced motion", () => {
        setPrefersReducedMotion(true)

        const formatter = vi.fn(formatRounded)
        const { result, rerender } = renderHook(
            ({ value }) => useCountUp(value, { duration: 0.2, formatter }),
            { initialProps: { value: 0 } },
        )

        rerender({ value: 500 })

        // No animation frames: the effect sets the final value synchronously,
        // so the formatter only ever sees the endpoints.
        expect(result.current).toBe("500")
        for (const [arg] of formatter.mock.calls) {
            expect([0, 500]).toContain(arg)
        }
    })

    it("stops cleanly on unmount mid-animation", () => {
        const { rerender, unmount } = renderHook(
            ({ value }) => useCountUp(value, { duration: 0.2, formatter: formatRounded }),
            { initialProps: { value: 0 } },
        )

        rerender({ value: 100 })

        expect(() => unmount()).not.toThrow()
    })
})
