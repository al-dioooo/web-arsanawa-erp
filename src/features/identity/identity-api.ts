"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest, jsonBody } from "@/lib/api-client"
import type { Profile } from "@/lib/types"

export type IdentityProfileInput = {
    display_name?: string | null
    avatar?: string | null
    locale?: string | null
    timezone?: string | null
}

export function getIdentityProfile() {
    return apiRequest<Profile>("/api/v1/identity/profile").then((response) => response.data)
}

export function updateIdentityProfile(input: IdentityProfileInput) {
    return apiRequest<Profile>("/api/v1/identity/profile", {
        method: "PATCH",
        body: jsonBody(input),
    }).then((response) => response.data)
}

export function getIdentityUser(userId: number) {
    return apiRequest<Profile>(`/api/v1/identity/users/${userId}`).then((response) => response.data)
}

export function useIdentityProfile() {
    return useQuery({
        queryKey: ["identity", "profile"],
        queryFn: getIdentityProfile,
    })
}

export function useUpdateIdentityProfile() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: updateIdentityProfile,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["identity", "profile"] })
        },
    })
}

export function useIdentityUserLookup() {
    return useMutation({
        mutationFn: getIdentityUser,
    })
}
