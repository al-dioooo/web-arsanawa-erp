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

    if (!nextConfig.headers) throw new Error("nextConfig.headers must be defined")

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
        const policy = buildContentSecurityPolicy("test-nonce", "production")

        expect(policy).toContain("default-src 'self'")
        expect(policy).toContain("base-uri 'self'")
        expect(policy).toContain("form-action 'self'")
        expect(policy).toContain("frame-ancestors 'none'")
        expect(policy).toContain("object-src 'none'")
        expect(policy).toContain("script-src 'self' 'nonce-test-nonce' 'strict-dynamic'")
        expect(policy).toContain("style-src 'self' 'nonce-test-nonce'")
        expect(policy).toContain("img-src 'self' blob: data: https://api-arsanawa-erp.azuregarden.dedyn.io")
        expect(policy).toContain("font-src 'self' data:")
        expect(policy).toContain("connect-src 'self' https://api-arsanawa-erp.azuregarden.dedyn.io http://127.0.0.1:8000 http://localhost:8000 http://api-arsanawa-erp.test https://api-arsanawa-erp.test https://api-arsanawa-erp-production.up.railway.app http://103.93.160.222:8080 https://api-arsanawa-erp.duckdns.org http://api-arsanawa-erp.duckdns.org")
        expect(policy).toContain("frame-src 'none'")
        expect(policy).toContain("media-src 'self'")
        expect(policy).toContain("manifest-src 'self'")
        expect(policy).toContain("worker-src 'self' blob:")
        expect(policy).not.toContain("*")
        expect(policy).not.toContain("'unsafe-inline'")
    })
})
