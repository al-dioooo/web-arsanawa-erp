// The browser only ever talks to the single API origin the app was built
// against (see `apiBaseUrl()` in lib/api-client.ts), so derive the allow-list
// from that rather than accumulating one hardcoded origin per deploy target.
// Local-only origins are added back in development, where plaintext is fine.
const DEVELOPMENT_API_ORIGINS = [
    "http://127.0.0.1:8000",
    "http://localhost:8000",
    "http://api-erp.test",
    "http://api-arsanawa-erp.test",
    "https://api-arsanawa-erp.test",
]

function normalizePolicy(policy: string): string {
    return policy.replace(/\s{2,}/g, " ").trim()
}

function apiOrigin(apiUrl: string | undefined): string | null {
    if (!apiUrl) return null

    try {
        return new URL(apiUrl).origin
    } catch {
        return null
    }
}

/**
 * Origins the browser may reach for API calls and API-served images.
 *
 * In production only an HTTPS origin is accepted: allow-listing a plaintext
 * origin would sanction silently downgrading every API request, so a misconfigured
 * http:// value is dropped (the app fails loudly) rather than blessed.
 */
function apiSources(isDevelopment: boolean, apiUrl: string | undefined): string[] {
    const sources = new Set<string>()
    const origin = apiOrigin(apiUrl)

    if (origin && (isDevelopment || origin.startsWith("https://"))) {
        sources.add(origin)
    }

    if (isDevelopment) {
        for (const devOrigin of DEVELOPMENT_API_ORIGINS) {
            sources.add(devOrigin)
        }
    }

    return [...sources]
}

export function buildContentSecurityPolicy(
    nonce: string,
    environment = process.env.NODE_ENV ?? "production",
    // Referenced literally so Next.js inlines the value at build time.
    apiUrl = process.env.NEXT_PUBLIC_API_URL,
): string {
    const isDevelopment = environment === "development"
    const sources = apiSources(isDevelopment, apiUrl)
    const sourceList = sources.length > 0 ? ` ${sources.join(" ")}` : ""

    return normalizePolicy(`
        default-src 'self';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'none';
        object-src 'none';
        script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""};
        style-src 'self' 'nonce-${nonce}'${isDevelopment ? " 'unsafe-inline'" : ""};
        img-src 'self' blob: data:${sourceList};
        font-src 'self' data:;
        connect-src 'self'${sourceList};
        frame-src 'none';
        media-src 'self';
        manifest-src 'self';
        worker-src 'self' blob:;
    `)
}
