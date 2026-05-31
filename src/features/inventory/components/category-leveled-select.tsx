"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"
import {
    fieldControlClassName,
    fieldErrorClassName,
    fieldLabelClassName,
} from "@/components/ui/form-control"
import type { Category } from "@/features/inventory/inventory-types"
import { categoryBreadcrumb, flattenCategoryTree } from "@/features/inventory/category-tree"

type CategoryLeveledSelectProps = {
    label: string
    value: string | number
    onChange: (value: string | number) => void
    categories: Category[]
    mode: "all" | "leaf"
    placeholder?: string
    emptyLabel?: string
    required?: boolean
    error?: string
    className?: string
}

export function CategoryLeveledSelect({
    label,
    value,
    onChange,
    categories,
    mode,
    placeholder = "Select category",
    emptyLabel,
    required = false,
    error,
    className,
}: CategoryLeveledSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const containerRef = useRef<HTMLDivElement>(null)
    const options = useMemo(() => flattenCategoryTree(categories), [categories])
    const displayValue = value === "" ? "" : categoryBreadcrumb(categories, value)
    const filteredOptions = options.filter((option) => {
        const search = searchQuery.toLowerCase()

        return option.breadcrumb.toLowerCase().includes(search) || option.category.name.toLowerCase().includes(search)
    })

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
                setSearchQuery("")
            }
        }

        document.addEventListener("mousedown", handleClickOutside)

        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    return (
        <div ref={containerRef} className={cn("relative grid gap-1.5 text-sm font-medium text-navy-700", className)}>
            <span className={fieldLabelClassName}>{label}</span>
            <div className="relative">
                <input
                    type="text"
                    aria-label={label}
                    required={required && !value}
                    value={isOpen ? searchQuery : displayValue}
                    placeholder={isOpen ? "Type to search..." : placeholder}
                    onFocus={() => setIsOpen(true)}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className={cn(fieldControlClassName, "w-full pr-10 cursor-pointer")}
                />
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-navy-500">
                    <Icon name="arrow_drop_down" size={20} />
                </span>

                {isOpen ? (
                    <div className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border border-navy-100 bg-white p-1 text-sm text-navy-900 shadow-lg outline-none">
                        {emptyLabel ? (
                            <button
                                type="button"
                                aria-label={emptyLabel}
                                onClick={() => {
                                    onChange("")
                                    setIsOpen(false)
                                    setSearchQuery("")
                                }}
                                className={cn(
                                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-left font-semibold transition-colors hover:bg-navy-50",
                                    value === "" ? "bg-teal-50 text-teal-700" : "text-navy-700",
                                )}
                            >
                                <span>{emptyLabel}</span>
                                {value === "" ? <Icon name="check" size={16} className="text-teal-700" /> : null}
                            </button>
                        ) : null}

                        {filteredOptions.map((option) => {
                            const selected = String(option.category.id) === String(value)
                            const disabled = mode === "leaf" && !option.isLeaf
                            const accessibleName = disabled ? `${option.breadcrumb} - parent category` : option.breadcrumb

                            return (
                                <button
                                    key={option.category.id}
                                    type="button"
                                    aria-label={accessibleName}
                                    disabled={disabled}
                                    onClick={() => {
                                        onChange(option.category.id)
                                        setIsOpen(false)
                                        setSearchQuery("")
                                    }}
                                    className={cn(
                                        "group flex w-full items-center justify-between rounded-md py-2 pr-3 text-left transition-colors",
                                        selected ? "bg-teal-50 text-teal-700" : "text-navy-800 hover:bg-navy-50",
                                        disabled ? "cursor-not-allowed opacity-55 hover:bg-transparent" : "cursor-pointer",
                                    )}
                                    style={{ paddingLeft: `${12 + option.depth * 22}px` }}
                                >
                                    <span className="flex min-w-0 items-center gap-2">
                                        {option.depth > 0 ? (
                                            <span className="h-5 w-px shrink-0 bg-navy-100" aria-hidden="true" />
                                        ) : null}
                                        <span className="min-w-0">
                                            <span className="block truncate font-semibold">{option.category.name}</span>
                                            {option.parentBreadcrumb ? (
                                                <span className="block truncate text-[11px] font-medium text-navy-400">
                                                    {option.parentBreadcrumb}
                                                </span>
                                            ) : null}
                                        </span>
                                    </span>
                                    {selected ? <Icon name="check" size={16} className="shrink-0 text-teal-700" /> : null}
                                    {disabled ? (
                                        <span className="ml-3 shrink-0 rounded-full bg-navy-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy-400">
                                            Parent
                                        </span>
                                    ) : null}
                                </button>
                            )
                        })}

                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-2 text-sm italic text-navy-400">No categories found</div>
                        ) : null}
                    </div>
                ) : null}
            </div>
            {error ? <span className={fieldErrorClassName}>{error}</span> : null}
        </div>
    )
}
