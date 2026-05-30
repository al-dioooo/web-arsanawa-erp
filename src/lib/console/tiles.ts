import { canManageEntitlements } from "@/features/auth/access"
import type { AuthenticatedUser, Company, Membership } from "@/lib/types"

export type ConsoleTile = {
    key: string
    label: string
    icon: string
    accentColor: string
    route: string
    description?: string
}

type Translate = (key: string, values?: Record<string, string | number>) => string

type ConsoleTilesInput = {
    t: Translate
    activeCompany?: Company | null
    membership?: Membership | null
    user?: AuthenticatedUser | null
    withDescriptions?: boolean
}

export function buildConsoleTiles({
    t,
    activeCompany,
    membership,
    user,
    withDescriptions = false,
}: ConsoleTilesInput): ConsoleTile[] {
    const hasActiveCompany = Boolean(activeCompany)
    const canManageCompany = hasActiveCompany && canManageEntitlements(membership, user)

    return [
        {
            key: "organization",
            label: t("modules.organization"),
            icon: "corporate_fare",
            accentColor: "#0b5c6a",
            route: "/organization/companies",
            description: description(t, withDescriptions, "console.organizationDescription"),
        },
        {
            key: "profile",
            label: t("modules.profile"),
            icon: "manage_accounts",
            accentColor: "#137d90",
            route: "/profile",
            description: description(t, withDescriptions, "console.profileDescription"),
        },
        ...(hasActiveCompany
            ? [
                  {
                      key: "partners",
                      label: t("modules.partners"),
                      icon: "groups",
                      accentColor: "#f47b50",
                      route: "/partners",
                      description: description(t, withDescriptions, "console.partnersDescription"),
                  },
                  {
                      key: "platform-settings",
                      label: t("modules.platformSettings"),
                      icon: "settings_2",
                      accentColor: "#6f7d90",
                      route: "/platform/settings",
                      description: description(t, withDescriptions, "console.platformSettingsDescription"),
                  },
              ]
            : []),
        ...(canManageCompany
            ? [
                  {
                      key: "api-keys",
                      label: t("modules.apiKeys"),
                      icon: "key",
                      accentColor: "#85622b",
                      route: "/organization/api-keys",
                      description: description(t, withDescriptions, "console.apiKeysDescription"),
                  },
                  {
                      key: "module-manager",
                      label: t("modules.moduleManager"),
                      icon: "settings_suggest",
                      accentColor: "#137d90",
                      route: "/organization/modules",
                      description: description(t, withDescriptions, "console.moduleManagerDescription"),
                  },
              ]
            : []),
    ]
}

function description(t: Translate, enabled: boolean, key: string): string | undefined {
    return enabled ? t(key) : undefined
}
