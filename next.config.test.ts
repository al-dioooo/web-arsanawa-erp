import nextConfig from "./next.config"
import { buildContentSecurityPolicy } from "./src/lib/security/csp"

type HeaderRule = {
    source: string
    headers: Array<{
        key: string
        value: string
    }>
}

async function configuredHeaderMap() {
    expect(typeof nextConfig.headers).toBe("function")

    const rules = await nextConfig.headers()
    const globalRule = (rules as HeaderRule[]).find((rule) => rule.source === "/:path*")

    expect(globalRule).toBeDefined()

    return new Map(globalRule?.headers.map((header) => [header.key, header.value]))
}

describe("next security headers", () => {
    it("disables the Next.js powered-by header", () => {
        expect(nextConfig.poweredByHeader).toBe(false)
    })

    it("configures anti-clickjacking and content-sniffing protections", async () => {
        const headers = await configuredHeaderMap()

        expect(headers.get("X-Content-Type-Options")).toBe("nosniff")
        expect(headers.get("X-Frame-Options")).toBe("DENY")
    })

    it("configures a non-zero HSTS policy for HTTPS deployments", async () => {
        const headers = await configuredHeaderMap()

        expect(headers.get("Strict-Transport-Security")).toBe("max-age=31536000; includeSubDomains")
    })

    it("restricts referrer leakage and browser features", async () => {
        const headers = await configuredHeaderMap()

        expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin")
        expect(headers.get("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=(), payment=()")
    })

    it("builds a complete nonce-based production CSP without wildcard or unsafe-inline directives", () => {
        const policy = buildContentSecurityPolicy("test-nonce", "production", "https://api.example.com")

        expect(policy).toContain("default-src 'self'")
        expect(policy).toContain("base-uri 'self'")
        expect(policy).toContain("form-action 'self'")
        expect(policy).toContain("frame-ancestors 'none'")
        expect(policy).toContain("object-src 'none'")
        expect(policy).toContain("script-src 'self' 'nonce-test-nonce' 'strict-dynamic'")
        expect(policy).toContain("style-src 'self' 'nonce-test-nonce'")
        expect(policy).toContain("font-src 'self' data:")
        expect(policy).toContain("frame-src 'none'")
        expect(policy).toContain("media-src 'self'")
        expect(policy).toContain("manifest-src 'self'")
        expect(policy).toContain("worker-src 'self' blob:")
        expect(policy).not.toContain("*")
        expect(policy).not.toContain("'unsafe-inline'")
        expect(policy).not.toContain("'unsafe-eval'")
    })

    it("allows only the configured API origin in production, not a hardcoded deploy list", () => {
        const policy = buildContentSecurityPolicy("n", "production", "https://api.example.com")

        expect(policy).toContain("connect-src 'self' https://api.example.com;")
        expect(policy).toContain("img-src 'self' blob: data: https://api.example.com;")
        // Historical deploy origins must not creep back: the app only ever calls
        // NEXT_PUBLIC_API_URL, so every extra origin is unused attack surface.
        expect(policy).not.toContain("103.93.160.222")
        expect(policy).not.toContain("duckdns")
        expect(policy).not.toContain("railway.app")
        expect(policy).not.toContain("localhost")
    })

    it("never allow-lists a plaintext API origin in production", () => {
        const policy = buildContentSecurityPolicy("n", "production", "http://api.example.com")

        // A misconfigured plaintext origin is dropped rather than blessed.
        expect(policy).not.toContain("http://api.example.com")
        expect(policy).toContain("connect-src 'self';")
    })

    it("permits local plaintext API origins in development only", () => {
        const policy = buildContentSecurityPolicy("n", "development", "http://localhost:8000")

        expect(policy).toContain("http://localhost:8000")
        expect(policy).toContain("http://127.0.0.1:8000")
        expect(policy).toContain("https://api-arsanawa-erp.test")
    })

    it("falls back to a self-only policy when no API origin is configured", () => {
        const policy = buildContentSecurityPolicy("n", "production", undefined)

        expect(policy).toContain("connect-src 'self';")
        expect(policy).toContain("img-src 'self' blob: data:;")
    })
})
