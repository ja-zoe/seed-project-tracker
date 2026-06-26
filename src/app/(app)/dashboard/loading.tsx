import { PageLoader } from "@/components/PageLoader";

// Shown during the hand-off into the dashboard (notably right after sign-in),
// so the transition gives immediate feedback instead of a blank screen.
export default function DashboardLoading() {
  return <PageLoader label="Loading your dashboard…" />;
}
