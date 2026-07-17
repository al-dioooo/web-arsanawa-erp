"use client"

import { FinanceDashboardView } from "@/features/finance/finance-dashboard-view"

/**
 * Finance `/finance` — module dashboard. All logic lives in the feature view;
 * this route stays a thin shell.
 */
export default function FinanceDashboard() {
    return <FinanceDashboardView />
}
