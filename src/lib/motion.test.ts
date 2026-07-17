import { describe, expect, it } from "vitest"
import { DUR, EASE, SPRING, transitions } from "./motion"

describe("motion tokens", () => {
    it("keeps every named spring non-bouncy (design-system rule)", () => {
        // Damping ratio ζ = damping / (2·√(stiffness·mass)). ζ ≥ ~1 means
        // critically damped: the animation settles without overshoot.
        for (const [name, spring] of Object.entries(SPRING)) {
            const zeta = spring.damping / (2 * Math.sqrt(spring.stiffness * spring.mass))
            expect(zeta, `SPRING.${name} must not overshoot (ζ=${zeta.toFixed(2)})`).toBeGreaterThanOrEqual(0.9)
        }
    })

    it("orders the duration scale", () => {
        expect(DUR.instant).toBeLessThan(DUR.fast)
        expect(DUR.fast).toBeLessThan(DUR.base)
        expect(DUR.base).toBeLessThan(DUR.slow)
        expect(DUR.slow).toBeLessThan(DUR.slower)
    })

    it("exits faster than it enters", () => {
        expect(transitions.exit.duration).toBeLessThanOrEqual(transitions.enter.duration)
        expect(transitions.drawerExit.duration).toBeLessThanOrEqual(transitions.drawer.duration)
    })

    it("uses valid cubic-bezier tuples", () => {
        for (const bezier of Object.values(EASE)) {
            expect(bezier).toHaveLength(4)
            expect(bezier[0]).toBeGreaterThanOrEqual(0)
            expect(bezier[0]).toBeLessThanOrEqual(1)
            expect(bezier[2]).toBeGreaterThanOrEqual(0)
            expect(bezier[2]).toBeLessThanOrEqual(1)
        }
    })
})
