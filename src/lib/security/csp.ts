const API_CONNECT_SOURCES = [
    "http://127.0.0.1:8000",
    "http://localhost:8000",
    "http://api-arsanawa-erp.test",
    "https://api-arsanawa-erp.test",
    "https://api-arsanawa-erp-production.up.railway.app",
    "http://103.93.160.222:8080",
]

function normalizePolicy(policy: string): string {
    return policy.replace(/\s{2,}/g, " ").trim()
}

export function buildContentSecurityPolicy(
    nonce: string,
    environment = process.env.NODE_ENV ?? "production",
): string {
    const isDevelopment = environment === "development"

    return normalizePolicy(`
        default-src 'self';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'none';
        object-src 'none';
        script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""};
        style-src 'self' 'nonce-${nonce}'${isDevelopment ? " 'unsafe-inline'" : ""};
        img-src 'self' blob: data:;
        font-src 'self' data:;
        connect-src 'self' ${API_CONNECT_SOURCES.join(" ")};
        frame-src 'none';
        media-src 'self';
        manifest-src 'self';
        worker-src 'self' blob:;
    `)
}
