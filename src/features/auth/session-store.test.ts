import { sessionStore } from "./session-store"

describe("sessionStore", () => {
    beforeEach(() => {
        window.localStorage.clear()
    })

    it("persists and rehydrates token", () => {
        const futureDate = new Date(Date.now() + 3600000).toISOString()
        sessionStore.setSession("test-token", futureDate)
        expect(sessionStore.getToken()).toBe("test-token")
    })

    it("clears expired token", () => {
        const pastDate = new Date(Date.now() - 3600000).toISOString()
        sessionStore.setSession("expired-token", pastDate)
        expect(sessionStore.getToken()).toBeNull()
    })
})
