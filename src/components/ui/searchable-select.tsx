import { useState, useRef, useEffect, useId, type KeyboardEvent } from "react"
import { Icon } from "@/components/ui/icon"
import { Highlight, HighlightItem } from "@/components/ui/highlight"
import { cn } from "@/lib/utils"
import {
    fieldControlClassName,
    fieldErrorClassName,
    fieldLabelClassName,
} from "@/components/ui/form-control"

export type Option = {
    value: string | number
    label: string
}

type SearchableSelectProps = {
    label?: string
    value: string | number
    onChange: (value: string | number) => void
    options: Option[]
    placeholder?: string
    required?: boolean
    disabled?: boolean
    error?: string
    className?: string
}

export function SearchableSelect({
    label,
    value,
    onChange,
    options,
    placeholder = "Select option",
    required = false,
    disabled = false,
    error,
    className = ""
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [activeIndex, setActiveIndex] = useState(-1)
    const containerRef = useRef<HTMLDivElement>(null)
    const baseId = useId()
    const listboxId = `${baseId}-listbox`
    const errorId = `${baseId}-error`

    // Find label of active value
    const selectedOption = options.find(opt => String(opt.value) === String(value))
    const displayValue = selectedOption ? selectedOption.label : ""

    // Filter options based on query
    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Handle clicks outside container to close dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
                setSearchQuery("")
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])

    // Point the active option at the current selection (or the first option) when
    // the menu opens or the filter changes.
    useEffect(() => {
        if (!isOpen) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setActiveIndex(-1)
            return
        }
        const selectedIndex = filteredOptions.findIndex(opt => String(opt.value) === String(value))
        setActiveIndex(selectedIndex >= 0 ? selectedIndex : (filteredOptions.length > 0 ? 0 : -1))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, searchQuery])

    // Keep the active option scrolled into view.
    useEffect(() => {
        if (!isOpen || activeIndex < 0) return
        document.getElementById(`${baseId}-option-${activeIndex}`)?.scrollIntoView?.({ block: "nearest" })
    }, [activeIndex, isOpen, baseId])

    function selectOption(opt: Option) {
        onChange(opt.value)
        setIsOpen(false)
        setSearchQuery("")
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        switch (event.key) {
            case "ArrowDown":
                event.preventDefault()
                if (!isOpen) {
                    setIsOpen(true)
                    return
                }
                setActiveIndex(index => Math.min(index + 1, filteredOptions.length - 1))
                break
            case "ArrowUp":
                event.preventDefault()
                if (!isOpen) {
                    setIsOpen(true)
                    return
                }
                setActiveIndex(index => Math.max(index - 1, 0))
                break
            case "Home":
                if (isOpen && filteredOptions.length > 0) {
                    event.preventDefault()
                    setActiveIndex(0)
                }
                break
            case "End":
                if (isOpen && filteredOptions.length > 0) {
                    event.preventDefault()
                    setActiveIndex(filteredOptions.length - 1)
                }
                break
            case "Enter":
                if (isOpen && activeIndex >= 0 && filteredOptions[activeIndex]) {
                    event.preventDefault()
                    selectOption(filteredOptions[activeIndex])
                }
                break
            case "Escape":
                if (isOpen) {
                    event.preventDefault()
                    setIsOpen(false)
                    setSearchQuery("")
                }
                break
        }
    }

    const activeOptionId = isOpen && activeIndex >= 0 ? `${baseId}-option-${activeIndex}` : undefined

    return (
        <div ref={containerRef} className={cn("relative grid gap-1.5 text-sm font-medium text-ink-secondary", className)}>
            {label && <span className={fieldLabelClassName}>{label}</span>}
            <div className="relative">
                <input
                    type="text"
                    role="combobox"
                    aria-expanded={isOpen}
                    aria-controls={listboxId}
                    aria-autocomplete="list"
                    aria-activedescendant={activeOptionId}
                    aria-label={label}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                    required={required && !value}
                    disabled={disabled}
                    value={isOpen ? searchQuery : displayValue}
                    placeholder={isOpen ? "Type to search..." : placeholder}
                    onFocus={() => !disabled && setIsOpen(true)}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className={cn(fieldControlClassName, "w-full pr-10 cursor-pointer")}
                />
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-ink-muted">
                    <Icon name="arrow_drop_down" size={20} />
                </span>

                {isOpen && (
                    <ul
                        id={listboxId}
                        role="listbox"
                        aria-label={label}
                        className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-surface-raised py-1 text-sm text-ink shadow-card-hover outline-none select-none"
                    >
                        {filteredOptions.length > 0 ? (
                            <Highlight
                                value={value ? String(value) : null}
                                containerClassName="flex flex-col gap-0.5 px-1"
                                className="bg-surface-muted rounded-md"
                                hover={true}
                            >
                                {filteredOptions.map((opt, index) => (
                                    <HighlightItem key={opt.value} value={String(opt.value)}>
                                        <li
                                            id={`${baseId}-option-${index}`}
                                            role="option"
                                            aria-selected={String(opt.value) === String(value)}
                                            onClick={() => selectOption(opt)}
                                            onMouseEnter={() => setActiveIndex(index)}
                                            className={cn(
                                                "relative cursor-pointer py-2 pl-3 pr-9 select-none transition-colors rounded-md",
                                                index === activeIndex && "bg-surface-muted",
                                                String(opt.value) === String(value)
                                                    ? "text-brand-ink font-semibold"
                                                    : "text-ink",
                                            )}
                                        >
                                            {opt.label}
                                            {String(opt.value) === String(value) && (
                                                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-brand-ink">
                                                    <Icon name="check" size={16} />
                                                </span>
                                            )}
                                        </li>
                                    </HighlightItem>
                                ))}
                            </Highlight>
                        ) : (
                            <li className="relative py-2 pl-3 pr-9 text-ink-muted italic">
                                No options found
                            </li>
                        )}
                    </ul>
                )}
            </div>
            {error && <span id={errorId} className={fieldErrorClassName}>{error}</span>}
        </div>
    )
}
