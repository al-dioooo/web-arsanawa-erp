import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformSettingsView } from "@/features/platform/platform-settings-view"
import { toast } from "sonner"
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

vi.mock("sonner", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
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
            "platform.allModules": "All modules",
            "platform.companySettingsList": "Company settings",
            "platform.companySettingsListDescription": "Review and update all database-backed settings for this company.",
            "platform.settingsCount": `${values?.count ?? 0} settings`,
            "platform.settingKey": "Setting key",
            "platform.settingValue": "Setting value",
            "platform.branchId": "Branch ID",
            "platform.companyWide": "Company-wide",
            "platform.saveSetting": "Save setting",
            "platform.saveAllSettings": "Save all settings",
            "platform.settingSaved": "Setting saved.",
            "platform.settingsSaved": "Settings saved.",
            "platform.noSettings": "No settings are configured for this filter.",
            "platform.jsonValue": "JSON value",
            "platform.invalidJson": "Enter valid JSON before saving.",
            "platform.invalidGoogleSheetsUrl": "Enter a Google Sheets URL.",
            "platform.cateringImportTitle": "SEKALORI Google Form Import",
            "platform.cateringImportDescription": "Configure the Google Form response sheet used by the POS configured import.",
            "platform.cateringImportSourceUrl": "Google Forms response sheet",
            "platform.cateringImportSourceUrlHint": "Paste a Google Sheets edit, share, or CSV export URL. It will be saved as a CSV export URL.",
            "platform.cateringImportMappingSummary": "Read-only import mapping",
            "platform.cateringImportMenuMap": "Menu bundles",
            "platform.cateringImportPaymentMap": "Payment methods",
            "platform.cateringImportDefaults": "Defaults",
            "platform.cateringImportSave": "Save catering import settings",
            "platform.cateringImportSaved": "Catering import settings saved.",
        }

        return labels[key] ?? key
    },
}))

const upsertSettings = vi.fn()

describe("PlatformSettingsView", () => {
    beforeEach(() => {
        upsertSettings.mockReset()
        vi.mocked(toast.success).mockReset()
        vi.mocked(toast.error).mockReset()
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
        } as unknown as ReturnType<typeof useUpsertPlatformSettings>)
    })

    it("renders all company settings and saves every value through the batch API", async () => {
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
                {
                    id: 6,
                    company_id: 1,
                    branch_id: null,
                    module: "inventory",
                    key: "low_stock_threshold",
                    value: 8,
                },
                {
                    id: 7,
                    company_id: 1,
                    branch_id: null,
                    module: "pos",
                    key: "catering_only",
                    value: true,
                },
            ],
            isLoading: false,
        } as ReturnType<typeof usePlatformSettings>)

        render(<PlatformSettingsView />)

        expect(screen.getByText("IDR")).toBeInTheDocument()
        expect(screen.getByText("2 decimal places")).toBeInTheDocument()
        expect(screen.getByText(/system-managed/i)).toBeInTheDocument()
        expect(screen.queryByRole("button", { name: /edit.*currency/i })).not.toBeInTheDocument()
        await waitFor(() => expect(screen.getByText("3 settings")).toBeInTheDocument())

        expect(screen.getByText("default_cash_account_id")).toBeInTheDocument()
        expect(screen.getByText("low_stock_threshold")).toBeInTheDocument()
        expect(screen.getByText("catering_only")).toBeInTheDocument()

        fireEvent.change(screen.getByLabelText("default_cash_account_id value"), {
            target: { value: "1020" },
        })
        fireEvent.change(screen.getByLabelText("low_stock_threshold value"), {
            target: { value: "12" },
        })
        fireEvent.click(screen.getByLabelText("catering_only value"))
        fireEvent.click(screen.getByRole("button", { name: "Save all settings" }))

        expect(upsertSettings).toHaveBeenCalledWith([
            {
                module: "finance",
                key: "default_cash_account_id",
                value: "1020",
                branch_id: null,
            },
            {
                module: "inventory",
                key: "low_stock_threshold",
                value: 12,
                branch_id: null,
            },
            {
                module: "pos",
                key: "catering_only",
                value: false,
                branch_id: null,
            },
        ])

        await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Settings saved."))
        expect(screen.queryByText("Settings saved.")).not.toBeInTheDocument()
        expect(screen.queryByText("Ready")).not.toBeInTheDocument()
        expect(screen.queryByText("Syncing")).not.toBeInTheDocument()
    })

    it("keeps unsaved setting edits when switching module filters", async () => {
        vi.mocked(usePlatformSettings).mockReturnValue({
            data: [
                {
                    id: 7,
                    company_id: 1,
                    branch_id: null,
                    module: "pos",
                    key: "catering_only",
                    value: true,
                },
                {
                    id: 8,
                    company_id: 1,
                    branch_id: null,
                    module: "inventory",
                    key: "hide_catering_restricted_features",
                    value: true,
                },
            ],
            isLoading: false,
        } as ReturnType<typeof usePlatformSettings>)

        render(<PlatformSettingsView />)

        await waitFor(() => expect(screen.getByText("2 settings")).toBeInTheDocument())

        fireEvent.change(screen.getByLabelText("Module"), { target: { value: "pos" } })
        fireEvent.click(screen.getByLabelText("catering_only value"))
        expect(screen.getByLabelText("catering_only value")).not.toBeChecked()

        fireEvent.change(screen.getByLabelText("Module"), { target: { value: "inventory" } })
        expect(screen.getByLabelText("hide_catering_restricted_features value")).toBeChecked()

        fireEvent.change(screen.getByLabelText("Module"), { target: { value: "pos" } })
        expect(screen.getByLabelText("catering_only value")).not.toBeChecked()
    })

    it("saves the full SEKALORI catering import configuration object", async () => {
        const cateringConfig = {
            source_url: "https://docs.google.com/spreadsheets/d/sekalori/export?format=csv&gid=0",
            field_map: {
                timestamp: "Timestamp",
                customer_name: "Nama Lengkap",
                customer_phone: "Nomor WhatsApp",
            },
            menu_type_bundle_skus: {
                "Indonesian Local": "SKL-BND-IDN",
                Western: "SKL-BND-WST",
                Japanese: "SKL-BND-JPN",
            },
            default_branch_code: "MAIN",
            default_quantity: 1,
            fulfilment_date_rule: "timestamp_plus_one_day",
            payment_method_map: {
                "Transfer Bank": "transfer",
                "E-Wallet": "qris",
                COD: null,
            },
            default_import_register_code: "GFORM-IMPORT",
        }

        vi.mocked(usePlatformSettings).mockReturnValue({
            data: [
                {
                    id: 11,
                    company_id: 1,
                    branch_id: null,
                    module: "pos",
                    key: "catering_only",
                    value: true,
                },
                {
                    id: 12,
                    company_id: 1,
                    branch_id: null,
                    module: "pos",
                    key: "catering_form_import",
                    value: cateringConfig,
                },
            ],
            isLoading: false,
        } as ReturnType<typeof usePlatformSettings>)

        render(<PlatformSettingsView />)

        fireEvent.change(screen.getByLabelText("Module"), { target: { value: "pos" } })

        await waitFor(() => {
            expect(screen.getByText("SEKALORI Google Form Import")).toBeInTheDocument()
        })

        expect(screen.getByText("Indonesian Local")).toBeInTheDocument()
        expect(screen.getByDisplayValue("SKL-BND-IDN")).toBeInTheDocument()
        expect(screen.getByText("Transfer Bank")).toBeInTheDocument()
        expect(screen.getByDisplayValue("transfer")).toBeInTheDocument()
        expect(screen.getByDisplayValue("MAIN")).toBeInTheDocument()
        expect(screen.getByDisplayValue("GFORM-IMPORT")).toBeInTheDocument()

        fireEvent.change(screen.getByLabelText("Google Forms response sheet"), {
            target: {
                value: "https://docs.google.com/spreadsheets/d/1SXmxOwiaxiKpl9r-JmlKV-1-0xIhS0EPaZK7aCkQAEM/edit?gid=2117219189#gid=2117219189",
            },
        })
        fireEvent.change(screen.getByLabelText("default_branch_code value"), { target: { value: "CENTRAL" } })
        fireEvent.change(screen.getByLabelText("default_quantity value"), { target: { value: "2" } })
        fireEvent.change(screen.getByLabelText("default_import_register_code value"), { target: { value: "FORM-2" } })
        fireEvent.change(screen.getByLabelText("field_map.customer_phone value"), { target: { value: "Phone" } })
        fireEvent.change(screen.getByLabelText("menu_type_bundle_skus.Western value"), { target: { value: "SKL-BND-WST-2" } })
        fireEvent.change(screen.getByLabelText("payment_method_map.Transfer Bank value"), { target: { value: "bank_transfer" } })
        fireEvent.click(screen.getByRole("button", { name: "Save all settings" }))

        expect(upsertSettings).toHaveBeenCalledWith([
            {
                module: "pos",
                key: "catering_only",
                value: true,
                branch_id: null,
            },
            {
                module: "pos",
                key: "catering_form_import",
                value: {
                    ...cateringConfig,
                    source_url: "https://docs.google.com/spreadsheets/d/1SXmxOwiaxiKpl9r-JmlKV-1-0xIhS0EPaZK7aCkQAEM/export?format=csv&gid=2117219189",
                    field_map: {
                        ...cateringConfig.field_map,
                        customer_phone: "Phone",
                    },
                    menu_type_bundle_skus: {
                        ...cateringConfig.menu_type_bundle_skus,
                        Western: "SKL-BND-WST-2",
                    },
                    default_branch_code: "CENTRAL",
                    default_quantity: 2,
                    payment_method_map: {
                        ...cateringConfig.payment_method_map,
                        "Transfer Bank": "bank_transfer",
                    },
                    default_import_register_code: "FORM-2",
                },
                branch_id: null,
            },
        ])

        await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Settings saved."))
    })

    it("blocks saving invalid JSON and invalid Google Sheets URLs", async () => {
        vi.mocked(usePlatformSettings).mockReturnValue({
            data: [
                {
                    id: 20,
                    company_id: 1,
                    branch_id: null,
                    module: "organization",
                    key: "welcome_banner",
                    value: { enabled: true },
                },
                {
                    id: 21,
                    company_id: 1,
                    branch_id: null,
                    module: "pos",
                    key: "catering_form_import",
                    value: {
                        source_url: "https://docs.google.com/spreadsheets/d/sekalori/export?format=csv&gid=0",
                    },
                },
            ],
            isLoading: false,
        } as ReturnType<typeof usePlatformSettings>)

        render(<PlatformSettingsView />)

        await waitFor(() => expect(screen.getByText("2 settings")).toBeInTheDocument())

        fireEvent.change(screen.getByLabelText("welcome_banner JSON value"), {
            target: { value: "{invalid" },
        })
        fireEvent.click(screen.getByRole("button", { name: "Save all settings" }))

        expect(upsertSettings).not.toHaveBeenCalled()
        expect(await screen.findByText("Enter valid JSON before saving.")).toBeInTheDocument()

        fireEvent.change(screen.getByLabelText("welcome_banner JSON value"), {
            target: { value: "{\"enabled\":false}" },
        })
        fireEvent.change(screen.getByLabelText("Module"), { target: { value: "pos" } })
        fireEvent.change(screen.getByLabelText("Google Forms response sheet"), {
            target: { value: "https://example.com/not-google-sheets.csv" },
        })
        fireEvent.click(screen.getByRole("button", { name: "Save all settings" }))

        expect(upsertSettings).not.toHaveBeenCalled()
        expect(await screen.findByText("Enter a Google Sheets URL.")).toBeInTheDocument()
    })
})
