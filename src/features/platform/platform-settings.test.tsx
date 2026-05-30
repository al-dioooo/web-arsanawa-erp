import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformSettingsView } from "@/features/platform/platform-settings-view"
import {
    usePlatformCurrencies,
    usePlatformSettings,
    useUpsertPlatformSettings,
} from "@/features/platform/platform-api"

vi.mock("@/features/platform/platform-api", () => ({
    usePlatformCurrencies: vi.fn(),
    usePlatformSettings: vi.fn(),
    useUpsertPlatformSettings: vi.fn(),
}))

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string, values?: Record<string, string | number>) => {
        const labels: Record<string, string> = {
            "common.ready": "Ready",
            "common.syncing": "Syncing",
            "platform.eyebrow": "Platform",
            "platform.companySettings": "Company Settings",
            "platform.description": "Manage shared currencies and module settings used across Finance, Inventory, and POS.",
            "platform.activeCurrencies": "Active Currencies",
            "platform.currenciesReadOnly": "Currencies are system-managed and read-only for now.",
            "platform.decimalPlaces": `${values?.count ?? 0} decimal places`,
            "platform.noActiveCurrencies": "No active currencies are configured.",
            "platform.moduleSetting": "Module Setting",
            "platform.moduleSettingDescription": "Update one company or branch setting at a time through the Platform batch endpoint.",
            "platform.module": "Module",
            "platform.settingKey": "Setting key",
            "platform.settingValue": "Setting value",
            "platform.branchId": "Branch ID",
            "platform.companyWide": "Company-wide",
            "platform.saveSetting": "Save setting",
            "platform.settingSaved": "Setting saved.",
        }

        return labels[key] ?? key
    },
}))

const upsertSettings = vi.fn()

describe("PlatformSettingsView", () => {
    beforeEach(() => {
        upsertSettings.mockReset()
        vi.mocked(usePlatformCurrencies).mockReturnValue({
            data: [
                {
                    id: 1,
                    code: "IDR",
                    name: "Indonesian Rupiah",
                    symbol: "Rp",
                    decimal_places: 2,
                    is_active: true,
                },
            ],
            isLoading: false,
        } as ReturnType<typeof usePlatformCurrencies>)
        vi.mocked(usePlatformSettings).mockReturnValue({
            data: [
                {
                    id: 5,
                    company_id: 1,
                    branch_id: null,
                    module: "finance",
                    key: "default_cash_account_id",
                    value: "1010",
                },
            ],
            isLoading: false,
        } as ReturnType<typeof usePlatformSettings>)
        vi.mocked(useUpsertPlatformSettings).mockReturnValue({
            mutateAsync: upsertSettings,
            isPending: false,
        } as ReturnType<typeof useUpsertPlatformSettings>)
    })

    it("renders currencies and updates module settings through the batch API", async () => {
        render(<PlatformSettingsView />)

        expect(screen.getByText("IDR")).toBeInTheDocument()
        expect(screen.getByText("2 decimal places")).toBeInTheDocument()
        expect(screen.getByText(/system-managed/i)).toBeInTheDocument()
        expect(screen.queryByRole("button", { name: /edit.*currency/i })).not.toBeInTheDocument()
        await waitFor(() => expect(screen.getByDisplayValue("1010")).toBeInTheDocument())

        fireEvent.change(screen.getByLabelText("Setting value"), {
            target: { value: "1020" },
        })
        fireEvent.click(screen.getByRole("button", { name: "Save setting" }))

        expect(upsertSettings).toHaveBeenCalledWith([
            {
                module: "finance",
                key: "default_cash_account_id",
                value: "1020",
                branch_id: null,
            },
        ])
    })
})
