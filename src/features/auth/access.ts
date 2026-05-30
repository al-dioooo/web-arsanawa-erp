import type { AuthenticatedUser, Membership } from "@/lib/types"

const organizationManagerRoles = new Set(["owner", "admin"])

export function canManageOrganization(membership?: Membership | null, user?: AuthenticatedUser | null): boolean {
    if (user?.is_developer) {
        return true
    }

    return Boolean(membership?.role && organizationManagerRoles.has(membership.role))
}

export function canManageEntitlements(membership?: Membership | null, user?: AuthenticatedUser | null): boolean {
    return canManageOrganization(membership, user)
}
