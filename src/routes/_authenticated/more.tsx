import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BadgeIndianRupee, Bell, BarChart3, FileBarChart, UserCog, ChevronRight, Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useAuth, useRole } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/more")({ component: MorePage });

function MorePage() {
  const { user } = useAuth();
  const { data: role } = useRole();
  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const baseItems = [
    { to: "/ai-assistant", label: "AI Assistant", icon: Sparkles },
    { to: "/bookings", label: "Bookings", icon: BadgeIndianRupee },
    { to: "/notifications", label: "Notifications", icon: Bell },
  ];
  const adminItems = [
    { to: "/employees", label: "Team & Roles", icon: UserCog },
    { to: "/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/reports", label: "Reports", icon: FileBarChart },
  ];
  const items = role?.isAdmin ? [...baseItems, ...adminItems] : baseItems;

  const roleLabels = (role?.roles ?? []).map((r) =>
    r === "super_receptionist" ? "Super Receptionist" : r.charAt(0).toUpperCase() + r.slice(1)
  );

  return (
    <div>
      <PageHeader title="More" subtitle="Account, tools and admin features." />
      <div className="mb-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
            {(profile?.name || user?.email || "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{profile?.name || "—"}</div>
            <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {roleLabels.length ? roleLabels.map((r) => (
            <span key={r} className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-medium text-accent-foreground">{r}</span>
          )) : <span className="text-xs text-muted-foreground">No role assigned</span>}
        </div>
      </div>

      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.to}>
            <Link to={it.to} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-accent">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <it.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 font-medium">{it.label}</div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}