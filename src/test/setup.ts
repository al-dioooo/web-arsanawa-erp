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
}
