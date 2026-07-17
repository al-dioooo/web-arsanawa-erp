"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Field } from "@/components/ui/field"
import {
    fieldControlClassName,
    fieldDescriptionClassName,
    fieldLabelClassName,
} from "@/components/ui/form-control"
import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api-client"
import {
    sendWhatsAppTest,
    usePlatformSettings,
    useUpsertPlatformSettings,
    type PlatformSetting,
} from "@/features/platform/platform-api"

const MODULE = "whatsapp"

// Stable empty reference so the render-time sync below doesn't loop while loading.
const NO_SETTINGS: PlatformSetting[] = []

type Draft = {
    enabled: boolean
    token: string
    sender: string
    receipt_template: string
}

const EMPTY: Draft = { enabled: false, token: "", sender: "", receipt_template: "" }

function readRow(settings: PlatformSetting[], key: string): PlatformSetting | undefined {
    return settings.find((setting) => setting.key === key && setting.branch_id === null)
}

function readValue(settings: PlatformSetting[], key: string): unknown {
    return readRow(settings, key)?.value
}

function toDraft(settings: PlatformSetting[]): Draft {
    return {
        enabled: Boolean(readValue(settings, "enabled")),
        // The token is never seeded: the API redacts it, so the only token this
        // field ever holds is one the user just typed.
        token: "",
        sender: String(readValue(settings, "sender") ?? ""),
        receipt_template: String(readValue(settings, "receipt_template") ?? ""),
    }
}

export function WhatsAppSettings() {
    const t = useTranslations("platform.whatsapp")
    const { data } = usePlatformSettings(MODULE)
    const settings = data ?? NO_SETTINGS
    const upsert = useUpsertPlatformSettings()

    const [draft, setDraft] = useState<Draft>(EMPTY)
    const [testPhone, setTestPhone] = useState("")
    const [testing, setTesting] = useState(false)

    // The token itself never reaches the browser, so "is one saved?" is the only
    // thing the UI can know about it.
    const tokenConfigured = readRow(settings, "token")?.is_set ?? false

    // Seed the form from server settings once they arrive (and whenever they
    // change), using React's render-time "reset state on prop change" pattern.
    const [syncedFrom, setSyncedFrom] = useState<PlatformSetting[] | null>(null)
    if (syncedFrom !== settings) {
        setSyncedFrom(settings)
        setDraft(toDraft(settings))
    }

    function set<K extends keyof Draft>(key: K, value: Draft[K]) {
        setDraft((current) => ({ ...current, [key]: value }))
    }

    async function save() {
        const typedToken = draft.token.trim()

        if (draft.enabled && typedToken === "" && !tokenConfigured) {
            toast.error(t("tokenRequired"))
            return
        }

        try {
            await upsert.mutateAsync([
                { module: MODULE, key: "enabled", value: draft.enabled },
                { module: MODULE, key: "sender", value: draft.sender.trim() },
                { module: MODULE, key: "receipt_template", value: draft.receipt_template },
                // Only send the token when the user actually entered one; omitting
                // it leaves the stored credential untouched.
                ...(typedToken !== "" ? [{ module: MODULE, key: "token", value: typedToken }] : []),
            ])
            setDraft((current) => ({ ...current, token: "" }))
            toast.success(t("saved"))
        } catch (error) {
            toast.error(error instanceof ApiError ? error.message : t("saveError"))
        }
    }

    async function clearToken() {
        try {
            // An explicit empty string is the only way to remove a stored
            // credential, since null means "leave unchanged".
            await upsert.mutateAsync([{ module: MODULE, key: "token", value: "" }])
            setDraft((current) => ({ ...current, token: "", enabled: false }))
            toast.success(t("tokenCleared"))
        } catch (error) {
            toast.error(error instanceof ApiError ? error.message : t("saveError"))
        }
    }

    async function runTest() {
        if (testPhone.trim() === "") {
            toast.error(t("testPhoneRequired"))
            return
        }

        setTesting(true)
        try {
            const result = await sendWhatsAppTest({ to: testPhone.trim() })
            if (result.status === "sent") {
                toast.success(t("testSent"))
            } else if (result.status === "skipped") {
                toast.warning(t("testSkipped"))
            } else {
                toast.error(result.error || t("testFailed"))
            }
        } catch (error) {
            toast.error(error instanceof ApiError ? error.message : t("testFailed"))
        } finally {
            setTesting(false)
        }
    }

    return (
        <Card as="section" padding="lg">
            <div className="mb-5 flex items-start gap-3">
                <span className="flex size-10 items-center justify-center rounded-md bg-brand-soft text-brand-ink">
                    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9z" />
                        <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
                    </svg>
                </span>
                <div>
                    <h2 className="type-section">{t("title")}</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-muted">{t("description")}</p>
                </div>
            </div>

            <label className="mb-5 flex cursor-pointer items-center gap-3 rounded-md bg-surface-muted p-4">
                <input
                    type="checkbox"
                    checked={draft.enabled}
                    onChange={(event) => set("enabled", event.target.checked)}
                    className="size-4 accent-brand"
                />
                <span>
                    <span className={fieldLabelClassName}>{t("enabledLabel")}</span>
                    <span className={cn(fieldDescriptionClassName, "block")}>{t("enabledHint")}</span>
                </span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                    <Field
                        label={t("token")}
                        type="password"
                        autoComplete="off"
                        value={draft.token}
                        placeholder={tokenConfigured ? t("tokenPlaceholderSet") : "••••••••"}
                        onChange={(event) => set("token", event.target.value)}
                    />
                    {tokenConfigured ? (
                        <div className="flex items-center justify-between gap-3">
                            <span className={fieldDescriptionClassName}>{t("tokenConfigured")}</span>
                            <button
                                type="button"
                                onClick={clearToken}
                                disabled={upsert.isPending}
                                className="shrink-0 cursor-pointer text-xs font-semibold text-error underline"
                            >
                                {t("clearToken")}
                            </button>
                        </div>
                    ) : null}
                </div>
                <Field
                    label={t("sender")}
                    value={draft.sender}
                    placeholder="628xxxxxxxxxx"
                    onChange={(event) => set("sender", event.target.value)}
                />
            </div>

            <div className="mt-4 grid gap-1.5">
                <span className={fieldLabelClassName}>{t("template")}</span>
                <textarea
                    rows={3}
                    value={draft.receipt_template}
                    onChange={(event) => set("receipt_template", event.target.value)}
                    className={cn(fieldControlClassName, "min-h-24 font-mono text-xs leading-relaxed")}
                    placeholder={t("templatePlaceholder")}
                />
                <span className={fieldDescriptionClassName}>{t("templateHint")}</span>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="sm:w-56">
                        <Field
                            label={t("testPhone")}
                            value={testPhone}
                            placeholder="08xxxxxxxxxx"
                            onChange={(event) => setTestPhone(event.target.value)}
                        />
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={runTest}
                        disabled={testing}
                        className="w-full sm:w-auto"
                    >
                        {testing ? t("testing") : t("testSend")}
                    </Button>
                </div>
                <Button
                    type="button"
                    onClick={save}
                    disabled={upsert.isPending}
                    size="xl"
                    className="w-full sm:w-auto"
                >
                    {upsert.isPending ? t("saving") : t("save")}
                </Button>
            </div>
        </Card>
    )
}
