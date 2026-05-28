import type { Membership } from "@/lib/types"

const organizationManagerRoles = new Set(["owner", "admin"])

export function canManageOrganization(membership?: Membership | null): boolean {
    return Boolean(membership?.role && organizationManagerRoles.has(membership.role))
}

export function canManageEntitlements(membership?: Membership | null): boolean {
    return canManageOrganization(membership)
}
