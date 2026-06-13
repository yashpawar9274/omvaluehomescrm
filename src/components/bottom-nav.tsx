import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users2, ClipboardList, CalendarClock, MoreHorizontal } from "lucide-react";

const items = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/leads", label: "Leads", icon: Users2 },
  { to: "/visits", label: "Visits", icon: ClipboardList },
  { to: "/follow-ups", label: "Follow-up", icon: CalendarClock },
  { to: "/more", label: "More", icon: MoreHorizontal },
] as const;

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-border bg-card/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const active = path === it.to || (it.to !== "/dashboard" && path.startsWith(it.to));
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <it.icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
                <span className="font-medium">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}