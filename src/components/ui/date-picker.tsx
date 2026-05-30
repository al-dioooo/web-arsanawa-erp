"use client"

import * as React from "react"
import { Icon } from "@/components/ui/icon"
import { Highlight, HighlightItem } from "@/components/ui/highlight"
import { cn } from "@/lib/utils"
import {
    fieldControlClassName,
    fieldErrorClassName,
    fieldLabelClassName,
} from "@/components/ui/form-control"

type DatePickerProps = {
    label?: string
    value: string
    onChange: (value: string) => void
    required?: boolean
    error?: string
    placeholder?: string
    className?: string
}

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

export function DatePicker({
    label,
    value,
    onChange,
    required = false,
    error,
    placeholder = "Select date",
    className = "",
}: DatePickerProps) {
    const [isOpen, setIsOpen] = React.useState(false)
    const [position, setPosition] = React.useState<"top" | "bottom">("bottom")
    const containerRef = React.useRef<HTMLDivElement>(null)

    // Parse value date
    const parsedDate = (() => {
        if (!value) return null
        const parts = value.split("-")
        if (parts.length !== 3) return null
        const y = parseInt(parts[0], 10)
        const m = parseInt(parts[1], 10) - 1
        const d = parseInt(parts[2], 10)
        const date = new Date(y, m, d)
        return isNaN(date.getTime()) ? null : date
    })()

    // Current month/year shown in picker
    const [viewDate, setViewDate] = React.useState(() => parsedDate ?? new Date())

    // Update view date if value changed
    const [prevValue, setPrevValue] = React.useState(value)
    if (value !== prevValue) {
        setPrevValue(value)
        if (!value) {
            setViewDate(new Date())
        } else {
            const parts = value.split("-")
            if (parts.length === 3) {
                const y = parseInt(parts[0], 10)
                const m = parseInt(parts[1], 10) - 1
                const d = parseInt(parts[2], 10)
                const date = new Date(y, m, d)
                if (!isNaN(date.getTime())) {
                    setViewDate(date)
                }
            }
        }
    }

    // Close on click outside
    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const viewYear = viewDate.getFullYear()
    const viewMonth = viewDate.getMonth()

    const handlePrevMonth = () => {
        setViewDate(new Date(viewYear, viewMonth - 1, 1))
    }

    const handleNextMonth = () => {
        setViewDate(new Date(viewYear, viewMonth + 1, 1))
    }

    const handleSelectDay = (day: number, offsetMonth = 0) => {
        const targetDate = new Date(viewYear, viewMonth + offsetMonth, day)
        const y = targetDate.getFullYear()
        const m = String(targetDate.getMonth() + 1).padStart(2, "0")
        const d = String(targetDate.getDate()).padStart(2, "0")
        onChange(`${y}-${m}-${d}`)
        setIsOpen(false)
    }

    // Grid days math
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1)
    const firstDayOfWeek = firstDayOfMonth.getDay()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate()

    const daysGrid = []

    // Prev month padding
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        daysGrid.push({
            day: daysInPrevMonth - i,
            isCurrentMonth: false,
            offsetMonth: -1,
            key: `prev-${daysInPrevMonth - i}`,
        })
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
        daysGrid.push({
            day: i,
            isCurrentMonth: true,
            offsetMonth: 0,
            key: `curr-${i}`,
        })
    }

    // Next month padding
    const remaining = 42 - daysGrid.length
    for (let i = 1; i <= remaining; i++) {
        daysGrid.push({
            day: i,
            isCurrentMonth: false,
            offsetMonth: 1,
            key: `next-${i}`,
        })
    }

    const displayValue = parsedDate
        ? parsedDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
        : ""

    const activeDayKey = parsedDate
        ? `${parsedDate.getFullYear()}-${parsedDate.getMonth()}-${parsedDate.getDate()}`
        : null

    const handleToggleOpen = () => {
        if (!isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect()
            const viewportHeight = window.innerHeight
            const spaceBelow = viewportHeight - rect.bottom
            setPosition(spaceBelow < 350 ? "top" : "bottom")
        }
        setIsOpen(!isOpen)
    }

    return (
        <div ref={containerRef} className={cn("relative grid gap-1.5 text-sm font-medium text-navy-700", className)}>
            {label && <span className={fieldLabelClassName}>{label}</span>}
            <div className="relative">
                <input
                    type="text"
                    aria-label={label}
                    readOnly
                    required={required && !value}
                    value={displayValue}
                    placeholder={placeholder}
                    onClick={handleToggleOpen}
                    className={cn(fieldControlClassName, "w-full pr-10 cursor-pointer")}
                />
                <button
                    type="button"
                    onClick={handleToggleOpen}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-navy-500 hover:text-teal-700 transition cursor-pointer"
                >
                    <Icon name="calendar_month" className="text-lg" />
                </button>

                {isOpen && (
                    <div className={cn(
                        "absolute z-50 w-[280px] rounded-xl border border-navy-100 bg-white p-4 shadow-lg animate-in fade-in duration-150",
                        position === "bottom" ? "top-full mt-1 slide-in-from-top-2" : "bottom-full mb-1 slide-in-from-bottom-2"
                    )}>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <button
                                type="button"
                                onClick={handlePrevMonth}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-navy-100 hover:bg-navy-50 text-navy-600 transition cursor-pointer"
                            >
                                <Icon name="chevron_left" className="text-sm" />
                            </button>
                            <span className="font-bold text-navy-900 font-display">
                                {MONTHS[viewMonth]} {viewYear}
                            </span>
                            <button
                                type="button"
                                onClick={handleNextMonth}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-navy-100 hover:bg-navy-50 text-navy-600 transition cursor-pointer"
                            >
                                <Icon name="chevron_right" className="text-sm" />
                            </button>
                        </div>

                        {/* Days of week */}
                        <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-navy-400 mb-2 font-display">
                            {DAYS_OF_WEEK.map((day) => (
                                <div key={day} className="h-8 flex items-center justify-center">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Days grid with sliding hover highlight */}
                        <Highlight
                            value={activeDayKey}
                            containerClassName="grid grid-cols-7 gap-1"
                            className="bg-teal-50/70 rounded-lg"
                            hover={true}
                        >
                            {daysGrid.map((cell) => {
                                const cellDate = new Date(viewYear, viewMonth + cell.offsetMonth, cell.day)
                                const cellDateStr = `${cellDate.getFullYear()}-${cellDate.getMonth()}-${cellDate.getDate()}`
                                
                                const isSelected = parsedDate &&
                                    parsedDate.getDate() === cell.day &&
                                    parsedDate.getMonth() === cellDate.getMonth() &&
                                    parsedDate.getFullYear() === cellDate.getFullYear()

                                return (
                                    <HighlightItem key={cell.key} value={cellDateStr}>
                                        <button
                                            type="button"
                                            onClick={() => handleSelectDay(cell.day, cell.offsetMonth)}
                                            className={cn(
                                                "h-8 w-8 text-xs font-semibold rounded-lg flex items-center justify-center transition-colors cursor-pointer select-none",
                                                cell.isCurrentMonth ? "text-navy-800" : "text-navy-300",
                                                isSelected && "bg-teal-700 text-white font-bold hover:bg-teal-750"
                                            )}
                                        >
                                            {cell.day}
                                        </button>
                                    </HighlightItem>
                                )
                            })}
                        </Highlight>
                    </div>
                )}
            </div>
            {error && <span className={fieldErrorClassName}>{error}</span>}
        </div>
    )
}
