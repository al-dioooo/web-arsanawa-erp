"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type HighlightContextType = {
    hoveredValue: string | null
    setHoveredValue: (val: string | null) => void
    activeValue: string | null
    setActiveValue: (val: string | null) => void
    registerItem: (value: string, element: HTMLElement) => void
    unregisterItem: (value: string) => void
    hover: boolean
}

const HighlightContext = React.createContext<HighlightContextType | undefined>(undefined)

export function useHighlight() {
    const context = React.useContext(HighlightContext)
    if (!context) {
        throw new Error("useHighlight must be used within a HighlightProvider")
    }
    return context
}

type HighlightProps = {
    children: React.ReactNode
    value?: string | null
    defaultValue?: string | null
    onValueChange?: (val: string | null) => void
    className?: string
    containerClassName?: string
    style?: React.CSSProperties
    hover?: boolean
}

export function Highlight({
    children,
    value,
    defaultValue,
    onValueChange,
    className,
    containerClassName,
    style,
    hover = true,
}: HighlightProps) {
    const [activeValue, setActiveValueState] = React.useState<string | null>(value ?? defaultValue ?? null)
    const [hoveredValue, setHoveredValue] = React.useState<string | null>(null)

    const containerRef = React.useRef<HTMLDivElement>(null)
    const indicatorRef = React.useRef<HTMLDivElement>(null)
    const itemsMap = React.useRef<Map<string, HTMLElement>>(new Map())

    const activeValueToUse = value !== undefined ? value : activeValue

    const [prevValue, setPrevValue] = React.useState(value)
    if (value !== prevValue) {
        setPrevValue(value)
        setActiveValueState(value ?? null)
    }

    const updatePosition = React.useCallback(() => {
        if (!containerRef.current || !indicatorRef.current) return

        const targetValue = hoveredValue ?? activeValueToUse
        if (!targetValue) {
            indicatorRef.current.style.opacity = "0"
            return
        }

        const targetElement = itemsMap.current.get(targetValue)
        if (!targetElement) {
            indicatorRef.current.style.opacity = "0"
            return
        }

        const containerRect = containerRef.current.getBoundingClientRect()
        const targetRect = targetElement.getBoundingClientRect()

        indicatorRef.current.style.position = "absolute"
        indicatorRef.current.style.top = `${targetRect.top - containerRect.top}px`
        indicatorRef.current.style.left = `${targetRect.left - containerRect.left}px`
        indicatorRef.current.style.width = `${targetRect.width}px`
        indicatorRef.current.style.height = `${targetRect.height}px`
        indicatorRef.current.style.opacity = "1"
        indicatorRef.current.style.pointerEvents = "none"
    }, [hoveredValue, activeValueToUse])

    const registerItem = React.useCallback((val: string, element: HTMLElement) => {
        itemsMap.current.set(val, element)
        updatePosition()
    }, [updatePosition])

    const unregisterItem = React.useCallback((val: string) => {
        itemsMap.current.delete(val)
        updatePosition()
    }, [updatePosition])

    React.useEffect(() => {
        updatePosition()
        
        window.addEventListener("resize", updatePosition)
        return () => window.removeEventListener("resize", updatePosition)
    }, [updatePosition])

    const handleActiveValueChange = (val: string | null) => {
        setActiveValueState(val)
        onValueChange?.(val)
    }

    return (
        <HighlightContext.Provider
            value={{
                hoveredValue,
                setHoveredValue,
                activeValue: activeValueToUse,
                setActiveValue: handleActiveValueChange,
                registerItem,
                unregisterItem,
                hover,
            }}
        >
            <div
                ref={containerRef}
                className={cn("relative z-10", containerClassName)}
                onMouseLeave={() => setHoveredValue(null)}
            >
                <div
                    ref={indicatorRef}
                    style={{
                        ...style,
                        position: "absolute",
                        opacity: 0,
                    }}
                    className={cn(
                        "transition-all duration-200 ease-out z-0",
                        className
                    )}
                />
                {children}
            </div>
        </HighlightContext.Provider>
    )
}

type HighlightItemChildProps = React.HTMLAttributes<HTMLElement> & {
    ref?: React.Ref<HTMLElement>
    "data-active"?: string
    "data-hovered"?: string
}

type HighlightItemProps = {
    value: string
    children: React.ReactElement
    className?: string
}

export function HighlightItem({
    value,
    children,
    className,
}: HighlightItemProps) {
    const {
        hoveredValue,
        setHoveredValue,
        activeValue,
        setActiveValue,
        registerItem,
        unregisterItem,
        hover,
    } = useHighlight()

    const itemRef = React.useRef<HTMLElement | null>(null)

    const refCallback = React.useCallback((node: HTMLElement | null) => {
        if (node) {
            itemRef.current = node
            registerItem(value, node)
        } else {
            itemRef.current = null
            unregisterItem(value)
        }
    }, [value, registerItem, unregisterItem])

    const isActive = activeValue === value
    const isHovered = hoveredValue === value

    const element = React.Children.only(children) as React.ReactElement<HighlightItemChildProps>

    const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
        if (hover) {
            setHoveredValue(value)
        }
        element.props.onMouseEnter?.(e)
    }

    const handleClick = (e: React.MouseEvent<HTMLElement>) => {
        setActiveValue(value)
        element.props.onClick?.(e)
    }

    return React.cloneElement(element, {
        ref: refCallback,
        className: cn(
            element.props.className,
            className,
            "relative z-10 select-none cursor-pointer"
        ),
        "data-active": isActive ? "true" : "false",
        "data-hovered": isHovered ? "true" : "false",
        onMouseEnter: handleMouseEnter,
        onClick: handleClick,
    })
}
