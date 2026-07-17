/**
 * Test helper for the matchMedia mock installed in src/test/setup.ts.
 * Call setPrefersReducedMotion(true) before rendering to simulate a user
 * with `prefers-reduced-motion: reduce`; reset in afterEach.
 */
export function setPrefersReducedMotion(value: boolean) {
    globalThis.__prefersReducedMotion = value
    globalThis.__matchMediaListeners?.forEach((listener) =>
        listener({ matches: value, media: "(prefers-reduced-motion: reduce)" })
    )
}

export function resetPrefersReducedMotion() {
    setPrefersReducedMotion(false)
}
