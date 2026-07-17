import { describe, expect, it } from "vitest"
import {
    BAR_RADIUS,
    barCursorProps,
    CHART_ANIMATION,
    CHART_EXPENSE,
    CHART_INCOME,
    CHART_SERIES,
    chartAxisProps,
    chartGridProps,
    REFERENCE_LABEL,
    referenceLineProps,
} from "./chart-theme"

const CSS_VAR = /^var\(--[a-z0-9-]+\)$/

describe("chart theme tokens", () => {
    it("expresses every colour as a CSS variable so charts flip with the theme", () => {
        const colours = [
            ...CHART_SERIES,
            CHART_INCOME,
            CHART_EXPENSE,
            chartAxisProps.tick.fill,
            chartGridProps.stroke,
            referenceLineProps.stroke,
            REFERENCE_LABEL.fill,
            barCursorProps.fill,
        ]
        for (const colour of colours) {
            expect(colour, `${colour} must be a var(--…) reference`).toMatch(CSS_VAR)
        }
        expect(chartAxisProps.tick.fontFamily).toMatch(CSS_VAR)
    })

    it("keeps the categorical palette distinct and anchored by income/expense", () => {
        expect(new Set(CHART_SERIES).size).toBe(CHART_SERIES.length)
        expect(CHART_SERIES[0]).toBe(CHART_INCOME)
        expect(CHART_SERIES[1]).toBe(CHART_EXPENSE)
    })

    it("keeps entrance animations within the 400-800ms window", () => {
        for (const [name, config] of Object.entries(CHART_ANIMATION)) {
            expect(config.animationDuration, `${name} duration`).toBeGreaterThanOrEqual(400)
            expect(config.animationDuration, `${name} duration`).toBeLessThanOrEqual(800)
            expect(config.animationEasing).toBe("ease-out")
        }
    })

    it("rounds only the top corners of bars", () => {
        expect(BAR_RADIUS).toHaveLength(4)
        const [topLeft, topRight, bottomRight, bottomLeft] = BAR_RADIUS
        expect(topLeft).toBeGreaterThan(0)
        expect(topRight).toBe(topLeft)
        expect(bottomRight).toBe(0)
        expect(bottomLeft).toBe(0)
    })

    it("hides axis chrome in favour of the dashed horizontal grid", () => {
        expect(chartAxisProps.axisLine).toBe(false)
        expect(chartAxisProps.tickLine).toBe(false)
        expect(chartGridProps.vertical).toBe(false)
        expect(chartGridProps.strokeDasharray).toBe("3 3")
    })
})
