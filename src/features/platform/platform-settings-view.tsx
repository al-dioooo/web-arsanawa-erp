"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Field, SelectField } from "@/components/ui/field"
import { StatusPill } from "@/components/ui/status-pill"
import {
    usePlatformCurrencies,
    usePlatformSettings,
    useUpsertPlatformSettings,
} from "@/features/platform/platform-api"

const moduleOptions = ["finance", "inventory", "pos", "organization"]

export function PlatformSettingsView() {
    const [moduleKey, setModuleKey] = useState("finance")
    const { data: currencies = [], isLoading: currenciesLoading } = usePlatformCurrencies()
    const { data: settings = [], isLoading: settingsLoading } = usePlatformSettings(moduleKey)
    const upsertSettings = useUpsertPlatformSettings()
    const [form, setForm] = useState({
        key: "default_cash_account_id",
        value: "",
        branch_id: "",
    })
    const [message, setMessage] = useState<string | null>(null)

    const activeCurrencies = useMemo(
        () => currencies.filter((currency) => currency.is_active),
        [currencies],
    )

    useEffect(() => {
        const first = settings[0]
        if (!first) return

        let active = true
        void Promise.resolve().then(() => {
            if (!active) return

            setForm({
                key: first.key,
                value: typeof first.value === "string" ? first.value : JSON.stringify(first.value ?? ""),
                branch_id: first.branch_id ? String(first.branch_id) : "",
            })
        })
        return () => {
            active = false
        }
    }, [settings])

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setMessage(null)

        await upsertSettings.mutateAsync([
            {
                module: moduleKey,
                key: form.key.trim(),
                value: form.value,
                branch_id: form.branch_id ? Number(form.branch_id) : null,
            },
        ])

        setMessage("Setting saved.")
    }

    return (
        <div className="grid gap-6">
            <section className="rounded-2xl border border-navy-100 bg-white p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-teal-700 font-display">
                            Platform
                        </p>
                        <h1 className="mt-2 text-2xl font-brand font-bold text-navy-900">
                            Company Settings
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-navy-500">
                            Manage shared currencies and module settings used across Finance, Inventory, and POS.
                        </p>
                    </div>
                    <StatusPill tone={settingsLoading || currenciesLoading ? "amber" : "green"}>
                        {settingsLoading || currenciesLoading ? "Syncing" : "Ready"}
                    </StatusPill>
                </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
                <div className="rounded-2xl border border-navy-100 bg-white p-6">
                    <div className="mb-5 flex items-center justify-between gap-3">
                        <h2 className="text-lg font-bold text-navy-900 font-display">
                            Active Currencies
                        </h2>
                        <StatusPill tone="neutral">{activeCurrencies.length}</StatusPill>
                    </div>
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
                                        {currency.decimal_places} dp
                                    </StatusPill>
                                </div>
                            </article>
                        ))}
                        {!currenciesLoading && activeCurrencies.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-navy-100 bg-navy-50/30 p-4 text-sm text-navy-500">
                                No active currencies are configured.
                            </p>
                        ) : null}
                    </div>
                </div>

                <form className="rounded-2xl border border-navy-100 bg-white p-6" onSubmit={submit}>
                    <h2 className="text-lg font-bold text-navy-900 font-display">Module Setting</h2>
                    <p className="mt-1 text-xs leading-relaxed text-navy-500">
                        Upsert one setting at a time through the Platform batch endpoint.
                    </p>
                    <div className="mt-5 grid gap-4">
                        <SelectField
                            label="Module"
                            value={moduleKey}
                            onChange={(event) => setModuleKey(event.target.value)}
                        >
                            {moduleOptions.map((module) => (
                                <option key={module} value={module}>
                                    {module}
                                </option>
                            ))}
                        </SelectField>
                        <Field
                            label="Setting key"
                            value={form.key}
                            onChange={(event) =>
                                setForm((current) => ({ ...current, key: event.target.value }))
                            }
                            required
                        />
                        <Field
                            label="Setting value"
                            value={form.value}
                            onChange={(event) =>
                                setForm((current) => ({ ...current, value: event.target.value }))
                            }
                            required
                        />
                        <Field
                            label="Branch ID"
                            type="number"
                            min={1}
                            value={form.branch_id}
                            onChange={(event) =>
                                setForm((current) => ({ ...current, branch_id: event.target.value }))
                            }
                            placeholder="Company-wide"
                        />
                        <Button type="submit" size="xl" disabled={upsertSettings.isPending}>
                            Save setting
                        </Button>
                        {message ? (
                            <p className="rounded-xl border border-emerald-250 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-850">
                                {message}
                            </p>
                        ) : null}
                    </div>
                </form>
            </section>
        </div>
    )
}
