import type { ApiEnvelope, ApiValidationError } from "@/lib/types"
import { sessionStore } from "@/features/auth/session-store"
import { progressManager } from "@/lib/progress"

const fallbackApiUrl = "http://localhost:8000"

export class ApiError extends Error {
    readonly status: number
    readonly errors?: Record<string, string[]>

    constructor(status: number, payload: ApiValidationError) {
        super(payload.message)
        this.name = "ApiError"
        this.status = status
        this.errors = payload.errors
    }
}

export type ApiRequestOptions = {
    token?: string | null
    companyId?: number | null
    branchId?: number | null
    skipAuth?: boolean
    isRetry?: boolean
}

export function apiBaseUrl(): string {
    return (process.env.NEXT_PUBLIC_API_URL ?? fallbackApiUrl).replace(/\/$/, "")
}

let refreshPromise: Promise<string | null> | null = null

async function handleTokenRefresh(): Promise<string | null> {
    const currentToken = sessionStore.getToken()
    if (!currentToken) return null

    try {
        const response = await fetch(`${apiBaseUrl()}/api/v1/auth/refresh`, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": `Bearer ${currentToken}`
            }
        })

        if (!response.ok) {
            throw new Error("Refresh failed")
        }

        const payload = await response.json()
        const { access_token, expires_at } = payload.data
        sessionStore.setSession(access_token, expires_at)
        return access_token
    } catch {
        sessionStore.clear()
        if (typeof window !== "undefined") {
            window.location.href = "/login"
        }
        return null
    }
}

export async function apiRequest<T>(
    path: string,
    init: RequestInit = {},
    options: ApiRequestOptions = {}
): Promise<ApiEnvelope<T>> {
    progressManager.start()
    try {
        const headers = new Headers(init.headers)
        headers.set("Accept", "application/json")

        if (!(init.body instanceof FormData) && init.body !== undefined) {
            headers.set("Content-Type", "application/json")
        }

        const token = options.skipAuth ? null : (options.token ?? sessionStore.getToken())
        const companyId = options.companyId ?? sessionStore.getActiveCompanyId()
        const branchId = options.branchId ?? sessionStore.getActiveBranchId()

        if (token) {
            headers.set("Authorization", `Bearer ${token}`)
        }

        if (companyId) {
            headers.set("X-Company-Id", String(companyId))
        }

        if (branchId) {
            headers.set("X-Branch-Id", String(branchId))
        }

        const response = await fetch(`${apiBaseUrl()}${path}`, {
            ...init,
            headers,
        })

        if (response.status === 401 && token && !options.isRetry && path !== "/api/v1/auth/refresh") {
            if (!refreshPromise) {
                refreshPromise = handleTokenRefresh().finally(() => {
                    refreshPromise = null
                })
            }

            const newToken = await refreshPromise
            if (newToken) {
                return apiRequest<T>(path, init, {
                    ...options,
                    token: newToken,
                    isRetry: true
                })
            }
        }

        const payload = (await response.json().catch(() => ({
            message: "The API returned an invalid response.",
            data: null,
        }))) as ApiEnvelope<T> | ApiValidationError

        if (!response.ok) {
            throw new ApiError(response.status, payload as ApiValidationError)
        }

        return payload as ApiEnvelope<T>
    } finally {
        progressManager.done()
    }
}

export function jsonBody(data: unknown): string {
    return JSON.stringify(data)
}
