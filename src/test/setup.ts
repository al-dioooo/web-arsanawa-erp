import "@testing-library/jest-dom"

if (typeof window !== "undefined") {
    const store: Record<string, string> = {}
    
    const mockLocalStorage = {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value
        },
        removeItem: (key: string) => {
            delete store[key]
        },
        clear: () => {
            for (const key in store) {
                delete store[key]
            }
        },
        length: 0,
        key: (index: number) => Object.keys(store)[index] || null
    }

    Object.defineProperty(window, "localStorage", {
        value: mockLocalStorage,
        writable: true
    })

    // jsdom has no matchMedia. next-themes and Motion's useReducedMotion both
    // query it; tests can flip the reduced-motion switch via
    // setPrefersReducedMotion from "@/test/reduced-motion".
    if (typeof window.matchMedia !== "function") {
        type MediaListener = (event: { matches: boolean; media: string }) => void
        const listeners = new Set<MediaListener>()

        const matchMediaMock = (query: string): MediaQueryList => {
            const isReducedMotionQuery = query.includes("prefers-reduced-motion")
            const mql = {
                get matches() {
                    return isReducedMotionQuery ? globalThis.__prefersReducedMotion === true : false
                },
                media: query,
                onchange: null,
                addListener: (cb: MediaListener) => listeners.add(cb),
                removeListener: (cb: MediaListener) => listeners.delete(cb),
                addEventListener: (_type: string, cb: MediaListener) => listeners.add(cb),
                removeEventListener: (_type: string, cb: MediaListener) => listeners.delete(cb),
                dispatchEvent: () => true,
            }
            return mql as unknown as MediaQueryList
        }

        globalThis.__matchMediaListeners = listeners
        Object.defineProperty(window, "matchMedia", {
            value: matchMediaMock,
            writable: true,
        })
    }
}

declare global {
    // eslint-disable-next-line no-var
    var __prefersReducedMotion: boolean | undefined
    // eslint-disable-next-line no-var
    var __matchMediaListeners: Set<(event: { matches: boolean; media: string }) => void> | undefined
}

export {}
