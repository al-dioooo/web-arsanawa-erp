"use client"

import { HomeDashboardView } from "@/features/home/home-dashboard-view"

/**
 * Home `/` — dashboard + launcher. All logic lives in the feature view;
 * this route stays a thin shell.
 */
export default function HomePage() {
    return <HomeDashboardView />
}
