// Layouts
export { DashboardLayout } from "./components/layouts/dashboard-layout"
export { OrgLayout } from "./components/layouts/org-layout"
export { OrgSettingsLayout } from "./components/layouts/org-settings-layout"

// Components
export { TopHeader } from "./components/top-header"
export type { BreadcrumbItem } from "./components/top-header"
export { OrgSidebar } from "./components/org-sidebar"
export { OrgSwitcher } from "./components/org-switcher"
export { UserMenu } from "./components/user-menu"
export { OrgProvider, useCurrentOrg } from "./components/org-context"

// Page content
export { OrganizationsContent } from "./components/pages/organizations-content"
export { OrgPagePlaceholder } from "./components/pages/org-page-placeholder"

// Hooks
export { useOrgs, useOrg } from "./hooks/use-orgs"
export type { OrgSummary } from "./hooks/use-orgs"

// Lib
export { ORG_NAV_SECTIONS, PAGE_LABELS } from "./lib/nav"
export type { NavItem, NavSection } from "./lib/nav"
export { getTourSteps } from "./lib/onboarding-tour"
export type { TourStep } from "./lib/onboarding-tour"
