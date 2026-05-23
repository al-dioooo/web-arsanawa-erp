import { useState, useRef, useEffect } from "react"
import { Icon } from "@/components/ui/icon"
import { Highlight, HighlightItem } from "@/components/ui/highlight"

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
    error,
    className = ""
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const containerRef = useRef<HTMLDivElement>(null)

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

    return (
        <div ref={containerRef} className={`grid gap-1.5 text-sm font-medium text-navy-700 relative ${className}`}>
            {label && <span>{label}</span>}
            <div className="relative">
                <input
                    type="text"
                    required={required && !value}
                    value={isOpen ? searchQuery : displayValue}
                    placeholder={isOpen ? "Type to search..." : placeholder}
                    onFocus={() => setIsOpen(true)}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="min-h-11 w-full rounded-md border border-navy-100 bg-white pl-3 pr-10 text-sm text-navy-900 outline-none transition placeholder:text-navy-300 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 cursor-pointer"
                />
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-navy-500">
                    <Icon name="arrow_drop_down" size={20} />
                </span>

                {isOpen && (
                    <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-navy-100 bg-white py-1 text-sm text-navy-900 outline-none select-none">
                        {filteredOptions.length > 0 ? (
                            <Highlight
                                value={value ? String(value) : null}
                                containerClassName="flex flex-col gap-0.5 px-1"
                                className="bg-teal-50/50 rounded-md"
                                hover={true}
                            >
                                {filteredOptions.map((opt) => (
                                    <HighlightItem key={opt.value} value={String(opt.value)}>
                                        <li
                                            onClick={() => {
                                                onChange(opt.value)
                                                setIsOpen(false)
                                                setSearchQuery("")
                                            }}
                                            className={`relative cursor-pointer py-2 pl-3 pr-9 select-none transition-colors rounded-md ${
                                                String(opt.value) === String(value)
                                                    ? "text-teal-700 font-semibold"
                                                    : "text-navy-900"
                                            }`}
                                        >
                                            {opt.label}
                                            {String(opt.value) === String(value) && (
                                                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-teal-700">
                                                    <Icon name="check" size={16} />
                                                </span>
                                            )}
                                        </li>
                                    </HighlightItem>
                                ))}
                            </Highlight>
                        ) : (
                            <li className="relative py-2 pl-3 pr-9 text-navy-400 italic">
                                No options found
                            </li>
                        )}
                    </ul>
                )}
            </div>
            {error && <span className="text-xs font-medium text-destructive">{error}</span>}
        </div>
    )
}
