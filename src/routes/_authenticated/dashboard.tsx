import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { useRole } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data: role } = useRole();
  const isAdmin = !!role?.isAdmin;

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", isAdmin],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [leads, visits, todayVisits, upcomingVisits, completedVisits, pendingFu, bookings, scheduledLeads] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("visits").select("id", { count: "exact", head: true }),
        supabase.from("visits").select("id", { count: "exact", head: true }).eq("visit_date", today),
        supabase.from("visits").select("id", { count: "exact", head: true }).gt("visit_date", today),
        supabase.from("visits").select("id", { count: "exact", head: true }).lt("visit_date", today),
        supabase.from("follow_ups").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("bookings").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "visit_scheduled"),
      ]);
      return {
        leads: leads.count ?? 0,
        visits: visits.count ?? 0,
        todayVisits: todayVisits.count ?? 0,
        upcomingVisits: upcomingVisits.count ?? 0,
        completedVisits: completedVisits.count ?? 0,
        pendingFu: pendingFu.count ?? 0,
        bookings: bookings.count ?? 0,
        scheduledLeads: scheduledLeads.count ?? 0,
      };
    },
  });

  const { data: trend } = useQuery({
    queryKey: ["dashboard-trend"],
    queryFn: async () => {
      const since = new Date(); since.setDate(since.getDate() - 13);
      const { data } = await supabase
        .from("visits")
        .select("visit_date")
        .gte("visit_date", since.toISOString().slice(0, 10));
      const buckets: Record<string, number> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        buckets[d.toISOString().slice(5, 10)] = 0;
      }
      (data ?? []).forEach((r) => {
        const k = (r.visit_date as string).slice(5, 10);
        if (k in buckets) buckets[k]++;
      });
      return Object.entries(buckets).map(([day, visits]) => ({ day, visits }));
    },
  });

  const cards = [
    { label: "Total Leads", value: stats?.leads ?? "—" },
    { label: "Visits Scheduled (Leads)", value: stats?.scheduledLeads ?? "—" },
    { label: "Today's Visits", value: stats?.todayVisits ?? "—" },
    { label: "Upcoming Visits", value: stats?.upcomingVisits ?? "—" },
    { label: "Completed Visits", value: stats?.completedVisits ?? "—" },
    { label: "Pending Follow-ups", value: stats?.pendingFu ?? "—" },
    { label: "Bookings", value: stats?.bookings ?? "—" },
  ];

  return (
    <div>
      <PageHeader title={isAdmin ? "Admin Dashboard" : "My Dashboard"} subtitle="Snapshot of pipeline performance." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle></CardHeader>
            <CardContent className="text-3xl font-semibold tracking-tight">{c.value}</CardContent>
          </Card>
        ))}
      </div>
      <Card className="mt-6">
        <CardHeader><CardTitle>Visits — last 14 days</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend ?? []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="day" fontSize={12} />
              <YAxis fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="visits" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}