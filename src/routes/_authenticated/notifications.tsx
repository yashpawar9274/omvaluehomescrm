import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/notifications")({ component: NotificationsPage });

function NotificationsPage() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });
  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };
  return (
    <div>
      <PageHeader title="Notifications" subtitle="In-app reminders for follow-ups and team activity." />
      <div className="space-y-2">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">You're all caught up.</div>
        ) : rows.map((n: any) => (
          <div key={n.id} className={`flex items-start justify-between rounded-lg border border-border bg-card p-4 ${n.read ? "opacity-60" : ""}`}>
            <div>
              <div className="font-medium">{n.title}</div>
              {n.message ? <div className="text-sm text-muted-foreground">{n.message}</div> : null}
              <div className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
            </div>
            {!n.read && <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>Mark read</Button>}
          </div>
        ))}
      </div>
    </div>
  );
}