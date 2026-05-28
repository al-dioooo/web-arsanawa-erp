"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest, jsonBody } from "@/lib/api-client"

export type PlatformCurrency = {
    id: number
    code: string
    name: string
    symbol: string
    decimal_places: number
    is_active: boolean
}

export type PlatformSetting = {
    id: number
    company_id: number
    branch_id: number | null
    module: string
    key: string
    value: unknown
}

export type PlatformSettingInput = {
    module: string
    key: string
    value: unknown
    branch_id?: number | null
}

function queryString(params: Record<string, string | number | null | undefined>): string {
    const search = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
            search.set(key, String(value))
        }
    })

    const value = search.toString()
    return value ? `?${value}` : ""
}

export function listPlatformCurrencies() {
    return apiRequest<{ currencies: PlatformCurrency[] }>("/api/v1/platform/currencies").then(
        (response) => response.data.currencies,
    )
}

export function listPlatformSettings(module?: string) {
    return apiRequest<{ settings: PlatformSetting[] }>(
        `/api/v1/platform/settings${queryString({ module })}`,
    ).then((response) => response.data.settings)
}

export function upsertPlatformSettings(settings: PlatformSettingInput[]) {
    return apiRequest<{ settings: PlatformSetting[] }>("/api/v1/platform/settings", {
        method: "PUT",
        body: jsonBody({ settings }),
    }).then((response) => response.data.settings)
}

export function usePlatformCurrencies() {
    return useQuery({
        queryKey: ["platform", "currencies"],
        queryFn: listPlatformCurrencies,
    })
}

export function usePlatformSettings(module?: string) {
    return useQuery({
        queryKey: ["platform", "settings", module ?? "all"],
        queryFn: () => listPlatformSettings(module),
    })
}

export function useUpsertPlatformSettings() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: upsertPlatformSettings,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["platform", "settings"] })
        },
    })
}
