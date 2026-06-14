import { useEffect, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Building2, LogOut } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { BottomNav } from "./bottom-nav";
import { playNotificationSound, unlockNotificationSound, showSystemNotification } from "@/lib/notification-sound";

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Unread notifications badge (realtime)
  const { data: unread = 0 } = useQuery({
    queryKey: ["unread-notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("read", false);
      return count ?? 0;
    },
  });

  useEffect(() => {
    if (!user) return;
    // Unlock WebAudio on first user gesture so notification chimes can play.
    const unlock = () => { unlockNotificationSound(); };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    const ch = supabase
      .channel("rt-app-shell")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, (payload: any) => {
        qc.invalidateQueries({ queryKey: ["unread-notifications", user.id] });
        qc.invalidateQueries({ queryKey: ["notifications"] });
        if (payload.eventType === "INSERT" && payload.new?.user_id === user.id) {
          playNotificationSound();
          toast.message(payload.new.title, { description: payload.new.message ?? undefined });
          showSystemNotification(payload.new.title, payload.new.message ?? undefined);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => {
        qc.invalidateQueries({ queryKey: ["leads"] });
        qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "follow_ups" }, () => {
        qc.invalidateQueries({ queryKey: ["follow-ups"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "visits" }, () => {
        qc.invalidateQueries({ queryKey: ["visits"] });
        qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, () => {
        qc.invalidateQueries({ queryKey: ["role"] });
        qc.invalidateQueries({ queryKey: ["team"] });
      })
      .subscribe();

    // Generate "due today" follow-up reminders on mount and every 15 minutes.
    const runReminders = async () => {
      try { await (supabase as any).rpc("generate_due_followup_reminders"); } catch { /* ignore */ }
    };
    runReminders();
    const reminderTimer = window.setInterval(runReminders, 15 * 60 * 1000);

    return () => {
      supabase.removeChannel(ch);
      window.clearInterval(reminderTimer);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [user, qc]);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col bg-background">
      <header
        className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold leading-tight">VisitFlow</div>
          <div className="text-[11px] text-muted-foreground">Real-estate CRM</div>
        </div>
        <Link
          to="/notifications"
          className="relative grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>
        <button
          onClick={signOut}
          className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </header>
      <main className="flex-1 px-4 pb-24 pt-4">{children}</main>
      <BottomNav />
    </div>
  );
}