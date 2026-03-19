import { redirect } from "next/navigation";

// Redirect old dashboard-app route to canonical /dashboard
export default function DashboardAppPage() {
  redirect("/dashboard");
}
