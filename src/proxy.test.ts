import { NextRequest } from "next/server"
import { proxy } from "./proxy"

describe("security proxy", () => {
    it("sets a nonce-based CSP response header", () => {
        const request = new NextRequest("http://127.0.0.1:3005/")
        const response = proxy(request)
        const policy = response.headers.get("Content-Security-Policy")

        expect(policy).toContain("script-src 'self' 'nonce-")
        expect(policy).toContain("style-src 'self' 'nonce-")
        expect(policy).toContain("frame-ancestors 'none'")
        expect(policy).not.toContain("'unsafe-inline'")
    })
})
