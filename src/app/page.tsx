import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

// Root: route to the dashboard, the pending screen, or login depending on state.
export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.status !== "ACTIVE") redirect("/pending");
  redirect("/dashboard");
}
