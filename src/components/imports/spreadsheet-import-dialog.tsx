"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { Field } from "@/components/ui/field"
import { Icon } from "@/components/ui/icon"
import { SelectDescription } from "@/components/ui/select-description"
import { StatusPill } from "@/components/ui/status-pill"
import type { SpreadsheetImportResult, SpreadsheetImportSheet } from "@/features/inventory/inventory-types"

type ImportOperations = {
    downloadTemplate: (format: "csv" | "xlsx") => Promise<Blob>
    inspect: (input: { file?: File; sourceUrl?: string }) => Promise<SpreadsheetImportResult>
    preview: (importId: number, sheetName: string) => Promise<SpreadsheetImportResult>
    previewConfigured?: () => Promise<SpreadsheetImportResult>
    commit: (importId: number) => Promise<SpreadsheetImportResult>
}

export function SpreadsheetImportDialog({
    open,
    onClose,
    title,
    description,
    operations,
    configuredImportSettingsHref,
    onCommitted,
}: {
    open: boolean
    onClose: () => void
    title: string
    description: string
    operations: ImportOperations
    configuredImportSettingsHref?: string
    onCommitted?: () => void
}) {
    const [sourceMode, setSourceMode] = useState<"url" | "file">("url")
    const [sourceUrl, setSourceUrl] = useState("")
    const [file, setFile] = useState<File | null>(null)
    const [result, setResult] = useState<SpreadsheetImportResult | null>(null)
    const [sheetName, setSheetName] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isConfiguredPreview, setIsConfiguredPreview] = useState(false)

    const sheets = result?.sheets ?? result?.import.sheets ?? []
    const showSheetSelection = sheets.length > 0 && !isConfiguredPreview
    const selectedSheet = sheets.find((sheet) => sheet.name === sheetName)
    const canPreview = Boolean(result?.import.id && selectedSheet?.supported)
    const canCommit = result?.import.status === "previewed" && (result.import.error_count ?? 0) === 0
    const rowErrors = useMemo(
        () => (result?.rows ?? []).filter((row) => Object.keys(row.errors ?? {}).length > 0),
        [result],
    )

    async function run(callback: () => Promise<void>) {
        setIsLoading(true)
        try {
            await callback()
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : "Import request failed.")
        } finally {
            setIsLoading(false)
        }
    }

    async function download(format: "csv" | "xlsx") {
        await run(async () => {
            const blob = await operations.downloadTemplate(format)
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.download = `${title.toLowerCase().replace(/\s+/g, "-")}-template.${format}`
            link.click()
            URL.revokeObjectURL(url)
        })
    }

    function resetPreview() {
        setResult(null)
        setSheetName("")
        setIsConfiguredPreview(false)
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={title}
            description={description}
            widthClassName="max-w-3xl"
            footer={(
                <>
                    <Button type="button" variant="secondary" size="xl" onClick={onClose}>Close</Button>
                    <Button
                        type="button"
                        size="xl"
                        disabled={isLoading || !canCommit}
                        className="bg-brand text-white hover:bg-brand-hover"
                        onClick={() => void run(async () => {
                            if (!result?.import.id) return
                            const committed = await operations.commit(result.import.id)
                            setResult(committed)
                            onCommitted?.()
                        })}
                    >
                        Queue import
                    </Button>
                </>
            )}
        >
            <div className="grid gap-5">
                {operations.previewConfigured ? (
                    <div className="grid gap-3 rounded-md bg-brand-soft/30 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <p className="text-sm font-bold text-ink">Configured Google Form</p>
                                <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                                    Preview orders from the saved SEKALORI Google Forms response sheet.
                                </p>
                            </div>
                            {configuredImportSettingsHref ? (
                                <a
                                    href={configuredImportSettingsHref}
                                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-ink-secondary transition hover:bg-surface-muted hover:text-teal-700"
                                >
                                    <Icon name="settings" size={16} />
                                    Configure sheet URL
                                </a>
                            ) : null}
                        </div>
                        <div className="flex justify-end">
                            <Button
                                type="button"
                                size="xl"
                                disabled={isLoading}
                                className="bg-brand text-white hover:bg-brand-hover"
                                onClick={() => void run(async () => {
                                    resetPreview()
                                    const configuredResult = await operations.previewConfigured!()
                                    setIsConfiguredPreview(true)
                                    setResult(configuredResult)
                                })}
                            >
                                <Icon name="sync_alt" size={18} />
                                Use Configured Google Form
                            </Button>
                        </div>
                    </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => void download("csv")}>
                        <Icon name="description" size={16} />
                        Download CSV Template
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => void download("xlsx")}>
                        <Icon name="description" size={16} />
                        Download XLSX Template
                    </Button>
                </div>

                <div className="grid gap-3 rounded-md border border-line p-4">
                    <div className="flex gap-2">
                        <Button type="button" variant={sourceMode === "url" ? "default" : "outline"} size="sm" onClick={() => {
                            resetPreview()
                            setSourceMode("url")
                        }}>
                            Google Sheets URL
                        </Button>
                        <Button type="button" variant={sourceMode === "file" ? "default" : "outline"} size="sm" onClick={() => {
                            resetPreview()
                            setSourceMode("file")
                        }}>
                            File Upload
                        </Button>
                    </div>

                    {sourceMode === "url" ? (
                        <Field
                            label="Google Sheets URL"
                            value={sourceUrl}
                            onChange={(event) => setSourceUrl(event.target.value)}
                            placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
                        />
                    ) : (
                        <label className="grid gap-1.5 text-sm font-medium text-ink-secondary">
                            <span className="text-sm font-semibold text-ink-secondary">Spreadsheet file</span>
                            <input
                                aria-label="Spreadsheet file"
                                type="file"
                                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                                className="min-h-11 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink"
                            />
                        </label>
                    )}

                    <div className="flex justify-end">
                        <Button
                            type="button"
                            size="xl"
                            disabled={isLoading || (sourceMode === "url" ? !sourceUrl : !file)}
                            className="bg-brand text-white hover:bg-brand-hover"
                            onClick={() => void run(async () => {
                                const inspected = await operations.inspect(sourceMode === "url" ? { sourceUrl } : { file: file ?? undefined })
                                setResult(inspected)
                                const supported = (inspected.sheets ?? []).find((sheet) => sheet.supported)
                                setSheetName(supported?.name ?? "")
                            })}
                        >
                            Inspect source
                        </Button>
                    </div>
                </div>

                {showSheetSelection ? (
                    <div className="grid gap-3 rounded-md border border-line p-4">
                        <SelectDescription
                            label="Sheet page"
                            value={sheetName}
                            onChange={(event) => setSheetName(event.target.value)}
                            options={[
                                { value: "", label: "Select sheet" },
                                ...sheets.map((sheet: SpreadsheetImportSheet) => ({
                                    value: sheet.name,
                                    label: sheet.name,
                                    description: sheet.supported ? `${sheet.row_count} rows` : sheet.reason ?? "Unsupported",
                                    disabled: !sheet.supported,
                                })),
                            ]}
                        />
                        <div className="grid gap-2">
                            {sheets.map((sheet) => (
                                <div key={sheet.name} className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-3 py-2 text-sm">
                                    <span className="font-semibold text-ink">{sheet.name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-ink-muted">{sheet.row_count} rows</span>
                                        <StatusPill tone={sheet.supported ? "green" : "amber"}>{sheet.supported ? "Supported" : "Unsupported"}</StatusPill>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end">
                            <Button
                                type="button"
                                size="xl"
                                disabled={isLoading || !canPreview}
                                className="bg-brand text-white hover:bg-brand-hover"
                                onClick={() => void run(async () => {
                                    if (!result?.import.id) return
                                    setResult(await operations.preview(result.import.id, sheetName))
                                })}
                            >
                                Preview import
                            </Button>
                        </div>
                    </div>
                ) : null}

                {result?.import.status ? (
                    <div className="grid gap-3 rounded-md border border-line p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <StatusPill tone={result.import.error_count ? "amber" : "green"}>{result.import.status}</StatusPill>
                            <span className="text-sm font-semibold text-ink-muted">
                                {result.import.row_count} rows · {result.import.error_count} errors
                            </span>
                        </div>
                        {rowErrors.length > 0 ? (
                            <div className="grid gap-2">
                                {rowErrors.map((row) => (
                                    <div key={row.id} className="rounded-lg border bg-warning-soft px-3 py-2 text-sm text-warning-strong">
                                        <p className="font-bold">Row {row.row_number}</p>
                                        {Object.entries(row.errors).flatMap(([field, errors]) =>
                                            errors.map((error) => <p key={`${field}-${error}`}>{error}</p>),
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </Modal>
    )
}
