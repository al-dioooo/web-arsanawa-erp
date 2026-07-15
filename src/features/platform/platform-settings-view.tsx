"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { PageHeaderShell } from "@/components/ui/page-header-shell"
import { fieldControlClassName, fieldErrorClassName, fieldLabelClassName } from "@/components/ui/form-control"
import { SelectDescription } from "@/components/ui/select-description"
import { StatusPill } from "@/components/ui/status-pill"
import { cn } from "@/lib/utils"
import {
    usePlatformCurrencies,
    usePlatformSettings,
    useUpsertPlatformSettings,
    type PlatformSetting,
    type PlatformSettingInput,
} from "@/features/platform/platform-api"
import {
    isCateringFormImportConfig,
    normalizeGoogleSheetsCsvUrl,
    type CateringFormImportConfig,
} from "@/features/platform/catering-form-import-config"
import { WhatsAppSettings } from "@/features/platform/whatsapp-settings"

const moduleOptions = [
    {
        value: "finance",
        label: "finance",
        description: "Finance defaults for invoices, journals, payments, and tax workflows.",
    },
    {
        value: "inventory",
        label: "inventory",
        description: "Inventory defaults for catalogue, stock, pricing, and promotion workflows.",
    },
    {
        value: "pos",
        label: "pos",
        description: "Point of Sale defaults for registers, shifts, sales, and receipts.",
    },
    {
        value: "organization",
        label: "organization",
        description: "Organization defaults for company, branch, membership, and entitlement workflows.",
    },
]

type SettingDraft = PlatformSetting & {
    value: unknown
    jsonText: string
}

type FieldErrors = Record<string, string>

export function PlatformSettingsView() {
    const t = useTranslations()
    const [moduleKey, setModuleKey] = useState("all")
    const { data: currencies = [], isLoading: currenciesLoading } = usePlatformCurrencies()
    const { data: settings = [] } = usePlatformSettings()
    const upsertSettings = useUpsertPlatformSettings()
    const [drafts, setDrafts] = useState<SettingDraft[]>([])
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

    const activeCurrencies = useMemo(
        () => currencies.filter((currency) => currency.is_active),
        [currencies],
    )
    const visibleDrafts = useMemo(
        () => (moduleKey === "all" ? drafts : drafts.filter((setting) => setting.module === moduleKey)),
        [drafts, moduleKey],
    )
    const groupedDrafts = useMemo(() => groupSettingsByModule(visibleDrafts), [visibleDrafts])

    useEffect(() => {
        let active = true
        void Promise.resolve().then(() => {
            if (!active) return

            setDrafts(settings.map(createDraft))
            setFieldErrors({})
        })
        return () => {
            active = false
        }
    }, [settings])

    function updateDraft(settingId: number, updater: (draft: SettingDraft) => SettingDraft) {
        setDrafts((current) => current.map((draft) => (draft.id === settingId ? updater(draft) : draft)))
        setFieldErrors((current) => clearSettingErrors(current, settingId))
    }

    function updateValue(settingId: number, value: unknown) {
        updateDraft(settingId, (draft) => ({
            ...draft,
            value,
            jsonText: isJsonBackedValue(value) ? formatJson(value) : draft.jsonText,
        }))
    }

    function updateJsonText(settingId: number, jsonText: string) {
        updateDraft(settingId, (draft) => ({ ...draft, jsonText }))
    }

    function updateCateringConfig(settingId: number, updater: (config: CateringFormImportConfig) => CateringFormImportConfig) {
        updateDraft(settingId, (draft) => {
            const config = isCateringFormImportConfig(draft.value) ? draft.value : {}
            const next = updater(config)

            return {
                ...draft,
                value: next,
                jsonText: formatJson(next),
            }
        })
    }

    async function submitAll(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()

        const parsed = parseDraftsForSave(drafts, t)
        setFieldErrors(parsed.errors)

        if (Object.keys(parsed.errors).length > 0) {
            toast.error(Object.values(parsed.errors)[0])
            return
        }

        await upsertSettings.mutateAsync(parsed.settings)
        toast.success(t("platform.settingsSaved"))
    }

    return (
        <div className="grid gap-6">
            <PageHeaderShell
                eyebrow={t("platform.eyebrow")}
                title={t("platform.companySettings")}
                subtitle={t("platform.description")}
            />

            <WhatsAppSettings />

            <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                <div className="rounded-2xl border border-navy-100 bg-white p-6">
                    <div className="mb-5 flex items-center justify-between gap-3">
                        <h2 className="text-lg font-bold text-navy-900 font-display">
                            {t("platform.activeCurrencies")}
                        </h2>
                        <StatusPill tone="neutral">{activeCurrencies.length}</StatusPill>
                    </div>
                    <p className="mb-4 text-xs leading-relaxed text-navy-500">
                        {t("platform.currenciesReadOnly")}
                    </p>
                    <div className="grid gap-2">
                        {activeCurrencies.map((currency) => (
                            <article
                                key={currency.id}
                                className="rounded-xl border border-navy-100 bg-navy-50/20 p-4"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-bold text-navy-900">{currency.code}</p>
                                        <p className="mt-1 text-xs font-medium text-navy-500">
                                            {currency.name} · {currency.symbol}
                                        </p>
                                    </div>
                                    <StatusPill tone="green">
                                        {t("platform.decimalPlaces", { count: currency.decimal_places })}
                                    </StatusPill>
                                </div>
                            </article>
                        ))}
                        {!currenciesLoading && activeCurrencies.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-navy-100 bg-navy-50/30 p-4 text-sm text-navy-500">
                                {t("platform.noActiveCurrencies")}
                            </p>
                        ) : null}
                    </div>
                </div>

                <form className="rounded-2xl border border-navy-100 bg-white p-6" onSubmit={submitAll}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-navy-900 font-display">
                                {t("platform.companySettingsList")}
                            </h2>
                            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-navy-500">
                                {t("platform.companySettingsListDescription")}
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <StatusPill tone="neutral">{t("platform.settingsCount", { count: drafts.length })}</StatusPill>
                            <Button
                                type="submit"
                                size="xl"
                                disabled={upsertSettings.isPending || drafts.length === 0}
                                className="bg-teal-700 text-white hover:bg-teal-800"
                            >
                                {t("platform.saveAllSettings")}
                            </Button>
                        </div>
                    </div>

                    <div className="mt-5 max-w-sm">
                        <SelectDescription
                            label={t("platform.module")}
                            value={moduleKey}
                            onChange={(event) => setModuleKey(event.target.value)}
                            options={[
                                {
                                    value: "all",
                                    label: t("platform.allModules"),
                                    description: t("platform.companySettingsListDescription"),
                                },
                                ...moduleOptions,
                            ]}
                        />
                    </div>

                    <div className="mt-5 grid gap-5">
                        {visibleDrafts.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-navy-100 bg-navy-50/30 p-4 text-sm text-navy-500">
                                {t("platform.noSettings")}
                            </p>
                        ) : null}
                        {groupedDrafts.map(([module, rows]) => (
                            <section key={module} className="grid gap-3">
                                <div className="flex items-center justify-between gap-3 border-b border-navy-50 pb-2">
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-navy-500 font-display">
                                        {module}
                                    </h3>
                                    <StatusPill tone="neutral">{t("platform.settingsCount", { count: rows.length })}</StatusPill>
                                </div>
                                <div className="grid gap-3">
                                    {rows.map((setting) => (
                                        <SettingEditor
                                            key={setting.id}
                                            setting={setting}
                                            errors={fieldErrors}
                                            onValueChange={(value) => updateValue(setting.id, value)}
                                            onJsonTextChange={(value) => updateJsonText(setting.id, value)}
                                            onCateringConfigChange={(updater) => updateCateringConfig(setting.id, updater)}
                                            t={t}
                                        />
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                </form>
            </section>
        </div>
    )
}

function SettingEditor({
    setting,
    errors,
    onValueChange,
    onJsonTextChange,
    onCateringConfigChange,
    t,
}: {
    setting: SettingDraft
    errors: FieldErrors
    onValueChange: (value: unknown) => void
    onJsonTextChange: (value: string) => void
    onCateringConfigChange: (updater: (config: CateringFormImportConfig) => CateringFormImportConfig) => void
    t: ReturnType<typeof useTranslations>
}) {
    const valueKind = settingValueKind(setting.value)
    const cateringImportConfig = setting.module === "pos"
        && setting.key === "catering_form_import"
        && isCateringFormImportConfig(setting.value)
        ? setting.value
        : null

    return (
        <article className="grid gap-4 rounded-xl border border-navy-100 bg-navy-50/20 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-sm font-bold text-navy-900">{setting.key}</p>
                    <p className="mt-1 text-xs font-medium text-navy-500">
                        {setting.branch_id ? `${t("platform.branchId")} #${setting.branch_id}` : t("platform.companyWide")}
                    </p>
                </div>
                <StatusPill tone="neutral">{valueKind}</StatusPill>
            </div>

            {cateringImportConfig ? (
                <CateringImportSettingsPanel
                    config={cateringImportConfig}
                    errors={errors}
                    settingId={setting.id}
                    onChange={onCateringConfigChange}
                    t={t}
                />
            ) : (
                <GenericSettingValueEditor
                    setting={setting}
                    errors={errors}
                    valueKind={valueKind}
                    onValueChange={onValueChange}
                    onJsonTextChange={onJsonTextChange}
                    t={t}
                />
            )}
        </article>
    )
}

function GenericSettingValueEditor({
    setting,
    errors,
    valueKind,
    onValueChange,
    onJsonTextChange,
    t,
}: {
    setting: SettingDraft
    errors: FieldErrors
    valueKind: string
    onValueChange: (value: unknown) => void
    onJsonTextChange: (value: string) => void
    t: ReturnType<typeof useTranslations>
}) {
    const error = errors[fieldErrorKey(setting.id, "value")]

    if (typeof setting.value === "boolean") {
        return (
            <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-navy-100 bg-white px-3 text-sm font-medium text-navy-700">
                <span className="font-semibold">{t("platform.settingValue")}</span>
                <input
                    aria-label={`${setting.key} value`}
                    type="checkbox"
                    checked={setting.value}
                    onChange={(event) => onValueChange(event.target.checked)}
                    className="h-5 w-5 accent-teal-700"
                />
            </label>
        )
    }

    if (typeof setting.value === "number") {
        return (
            <Field
                label={t("platform.settingValue")}
                aria-label={`${setting.key} value`}
                type="number"
                value={String(setting.value)}
                onChange={(event) => onValueChange(Number(event.target.value))}
                error={error}
            />
        )
    }

    if (valueKind === "object" || valueKind === "array") {
        return (
            <JsonTextArea
                label={t("platform.jsonValue")}
                ariaLabel={`${setting.key} JSON value`}
                value={setting.jsonText}
                error={error}
                onChange={onJsonTextChange}
            />
        )
    }

    return (
        <Field
            label={t("platform.settingValue")}
            aria-label={`${setting.key} value`}
            value={typeof setting.value === "string" ? setting.value : ""}
            onChange={(event) => onValueChange(event.target.value)}
            error={error}
        />
    )
}

function CateringImportSettingsPanel({
    config,
    errors,
    settingId,
    onChange,
    t,
}: {
    config: CateringFormImportConfig
    errors: FieldErrors
    settingId: number
    onChange: (updater: (config: CateringFormImportConfig) => CateringFormImportConfig) => void
    t: ReturnType<typeof useTranslations>
}) {
    const fieldMap = asRecord(config.field_map)
    const menuMap = asRecord(config.menu_type_bundle_skus)
    const paymentMap = asRecord(config.payment_method_map)

    function setConfigValue(key: keyof CateringFormImportConfig, value: unknown) {
        onChange((current) => ({ ...current, [key]: value }))
    }

    function setMapValue(mapKey: "field_map" | "menu_type_bundle_skus" | "payment_method_map", key: string, value: unknown) {
        onChange((current) => ({
            ...current,
            [mapKey]: {
                ...asRecord(current[mapKey]),
                [key]: value,
            },
        }))
    }

    return (
        <div className="grid gap-4 rounded-xl border border-teal-100 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h4 className="text-sm font-bold text-navy-900">{t("platform.cateringImportTitle")}</h4>
                    <p className="mt-1 text-xs leading-relaxed text-navy-500">
                        {t("platform.cateringImportDescription")}
                    </p>
                </div>
                <StatusPill tone="green">SEKALORI</StatusPill>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                    <Field
                        label={t("platform.cateringImportSourceUrl")}
                        aria-label="Google Forms response sheet"
                        value={String(config.source_url ?? "")}
                        onChange={(event) => setConfigValue("source_url", event.target.value)}
                        placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=0"
                        error={errors[fieldErrorKey(settingId, "source_url")]}
                        required
                    />
                    <p className="mt-1 text-xs leading-relaxed text-navy-500">
                        {t("platform.cateringImportSourceUrlHint")}
                    </p>
                </div>
                <Field
                    label="default_branch_code"
                    aria-label="default_branch_code value"
                    value={String(config.default_branch_code ?? "")}
                    onChange={(event) => setConfigValue("default_branch_code", event.target.value)}
                />
                <Field
                    label="default_quantity"
                    aria-label="default_quantity value"
                    type="number"
                    value={String(config.default_quantity ?? 1)}
                    onChange={(event) => setConfigValue("default_quantity", Number(event.target.value))}
                    error={errors[fieldErrorKey(settingId, "default_quantity")]}
                />
                <Field
                    label="fulfilment_date_rule"
                    aria-label="fulfilment_date_rule value"
                    value={String(config.fulfilment_date_rule ?? "")}
                    onChange={(event) => setConfigValue("fulfilment_date_rule", event.target.value)}
                />
                <Field
                    label="default_import_register_code"
                    aria-label="default_import_register_code value"
                    value={String(config.default_import_register_code ?? "")}
                    onChange={(event) => setConfigValue("default_import_register_code", event.target.value)}
                />
            </div>

            <EditableMappingList
                title={t("platform.cateringImportMenuMap")}
                prefix="menu_type_bundle_skus"
                rows={menuMap}
                emptyLabel="-"
                onChange={(key, value) => setMapValue("menu_type_bundle_skus", key, value)}
            />
            <EditableMappingList
                title="Field map"
                prefix="field_map"
                rows={fieldMap}
                emptyLabel="-"
                onChange={(key, value) => setMapValue("field_map", key, value)}
            />
            <EditableMappingList
                title={t("platform.cateringImportPaymentMap")}
                prefix="payment_method_map"
                rows={paymentMap}
                emptyLabel="No payment"
                onChange={(key, value) => setMapValue("payment_method_map", key, value)}
            />
        </div>
    )
}

function EditableMappingList({
    title,
    prefix,
    rows,
    emptyLabel,
    onChange,
}: {
    title: string
    prefix: string
    rows: Record<string, unknown>
    emptyLabel: string
    onChange: (key: string, value: string) => void
}) {
    const entries = Object.entries(rows)

    return (
        <div className="grid gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-navy-500">{title}</p>
            {entries.length > 0 ? (
                <div className="grid gap-2 md:grid-cols-2">
                    {entries.map(([label, value]) => (
                        <Field
                            key={label}
                            label={label}
                            aria-label={`${prefix}.${label} value`}
                            value={value === null || value === undefined ? "" : String(value)}
                            onChange={(event) => onChange(label, event.target.value)}
                            placeholder={emptyLabel}
                        />
                    ))}
                </div>
            ) : (
                <p className="rounded-lg bg-navy-50 px-3 py-2 text-xs font-medium text-navy-400">{emptyLabel}</p>
            )}
        </div>
    )
}

function JsonTextArea({
    label,
    ariaLabel,
    value,
    error,
    onChange,
}: {
    label: string
    ariaLabel: string
    value: string
    error?: string
    onChange: (value: string) => void
}) {
    return (
        <label className="grid gap-1.5 text-sm font-medium text-navy-700">
            <span className={fieldLabelClassName}>{label}</span>
            <textarea
                aria-label={ariaLabel}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                rows={7}
                className={cn(fieldControlClassName, "min-h-32 py-3 font-mono text-xs leading-relaxed")}
            />
            {error ? <span className={fieldErrorClassName}>{error}</span> : null}
        </label>
    )
}

function createDraft(setting: PlatformSetting): SettingDraft {
    return {
        ...setting,
        jsonText: isJsonBackedValue(setting.value) ? formatJson(setting.value) : "",
    }
}

function parseDraftsForSave(
    drafts: SettingDraft[],
    t: ReturnType<typeof useTranslations>,
): { settings: PlatformSettingInput[]; errors: FieldErrors } {
    const errors: FieldErrors = {}
    const settings: PlatformSettingInput[] = []

    drafts.forEach((draft) => {
        let value: unknown = draft.value

        if (draft.module === "pos" && draft.key === "catering_form_import" && isCateringFormImportConfig(draft.value)) {
            value = normalizeCateringImportConfig(draft, errors, t)
        } else if (isJsonBackedValue(draft.value)) {
            try {
                value = JSON.parse(draft.jsonText)
            } catch {
                errors[fieldErrorKey(draft.id, "value")] = t("platform.invalidJson")
            }
        }

        settings.push({
            module: draft.module,
            key: draft.key,
            value,
            branch_id: draft.branch_id,
        })
    })

    return { settings, errors }
}

function normalizeCateringImportConfig(
    draft: SettingDraft,
    errors: FieldErrors,
    t: ReturnType<typeof useTranslations>,
): CateringFormImportConfig {
    const config = draft.value as CateringFormImportConfig
    let sourceUrl = String(config.source_url ?? "")

    try {
        sourceUrl = normalizeGoogleSheetsCsvUrl(sourceUrl)
    } catch {
        errors[fieldErrorKey(draft.id, "source_url")] = t("platform.invalidGoogleSheetsUrl")
    }

    const defaultQuantity = Number(config.default_quantity ?? 1)
    if (!Number.isFinite(defaultQuantity)) {
        errors[fieldErrorKey(draft.id, "default_quantity")] = t("platform.invalidJson")
    }

    return {
        ...config,
        source_url: sourceUrl,
        field_map: stringifyRecordValues(asRecord(config.field_map)),
        menu_type_bundle_skus: stringifyRecordValues(asRecord(config.menu_type_bundle_skus)),
        default_branch_code: String(config.default_branch_code ?? ""),
        default_quantity: Number.isFinite(defaultQuantity) ? defaultQuantity : 1,
        fulfilment_date_rule: String(config.fulfilment_date_rule ?? ""),
        payment_method_map: normalizePaymentMap(asRecord(config.payment_method_map)),
        default_import_register_code: String(config.default_import_register_code ?? ""),
    }
}

function groupSettingsByModule(settings: SettingDraft[]): Array<[string, SettingDraft[]]> {
    const knownModules = moduleOptions.map((option) => option.value)
    const extraModules = Array.from(new Set(settings.map((setting) => setting.module)))
        .filter((module) => !knownModules.includes(module))
        .sort()

    return [...knownModules, ...extraModules]
        .map((module): [string, SettingDraft[]] => [
            module,
            settings.filter((setting) => setting.module === module),
        ])
        .filter(([, rows]) => rows.length > 0)
}

function settingValueKind(value: unknown): string {
    if (Array.isArray(value)) return "array"
    if (value === null) return "null"
    return typeof value
}

function isJsonBackedValue(value: unknown): boolean {
    return typeof value === "object" && value !== null
}

function formatJson(value: unknown): string {
    return JSON.stringify(value, null, 2)
}

function fieldErrorKey(settingId: number, field: string): string {
    return `${settingId}.${field}`
}

function clearSettingErrors(errors: FieldErrors, settingId: number): FieldErrors {
    return Object.fromEntries(
        Object.entries(errors).filter(([key]) => !key.startsWith(`${settingId}.`)),
    )
}

function asRecord(value: unknown): Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {}
}

function stringifyRecordValues(value: Record<string, unknown>): Record<string, string> {
    return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, entry === null || entry === undefined ? "" : String(entry)]),
    )
}

function normalizePaymentMap(value: Record<string, unknown>): Record<string, string | null> {
    return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => {
            const text = entry === null || entry === undefined ? "" : String(entry).trim()

            return [key, text === "" ? null : text]
        }),
    )
}
