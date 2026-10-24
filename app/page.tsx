import { EchoDashboard } from "@/components/echo-dashboard";
import type { Greeting } from "@/types/ui";

export const dynamic = "force-dynamic";

function getGreeting(): Greeting {
  const now = new Date();
  const hour = now.getHours();
  return {
    date: new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(now),
    salutation: hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening",
  };
}

export default function Home() {
  return <EchoDashboard greeting={getGreeting()} />;
}
