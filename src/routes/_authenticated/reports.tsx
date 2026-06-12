import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({ component: ReportsPage });

function ReportsPage() {
  const { data } = useQuery({
    queryKey: ["report-summary"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);

      const [todayVisits, weekVisits, monthVisits, todayFu, monthBookings, totalLeads] = await Promise.all([
        supabase.from("visits").select("id", { count: "exact", head: true }).eq("visit_date", today),
        supabase.from("visits").select("id", { count: "exact", head: true }).gte("visit_date", weekAgo.toISOString().slice(0, 10)),
        supabase.from("visits").select("id", { count: "exact", head: true }).gte("visit_date", monthAgo.toISOString().slice(0, 10)),
        supabase.from("follow_ups").select("id", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("bookings").select("id", { count: "exact", head: true }).gte("created_at", monthAgo.toISOString()),
        supabase.from("leads").select("id", { count: "exact", head: true }),
      ]);
      return {
        todayVisits: todayVisits.count ?? 0, weekVisits: weekVisits.count ?? 0, monthVisits: monthVisits.count ?? 0,
        completedFu: todayFu.count ?? 0, monthBookings: monthBookings.count ?? 0, totalLeads: totalLeads.count ?? 0,
      };
    },
  });

  const exportCsv = async () => {
    const { data: visits } = await supabase.from("visits").select("*").limit(1000);
    if (!visits?.length) return;
    const headers = Object.keys(visits[0]);
    const csv = [headers.join(","), ...visits.map((r: any) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `visits-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const cards = [
    { l: "Visits today", v: data?.todayVisits },
    { l: "Visits this week", v: data?.weekVisits },
    { l: "Visits last 30d", v: data?.monthVisits },
    { l: "Completed follow-ups", v: data?.completedFu },
    { l: "Bookings last 30d", v: data?.monthBookings },
    { l: "Total leads", v: data?.totalLeads },
  ];

  return (
    <div>
      <PageHeader title="Reports" subtitle="Performance summary and exports."
        action={<Button onClick={exportCsv} variant="outline"><Download className="mr-2 h-4 w-4" />Export visits CSV</Button>}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.l}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{c.l}</CardTitle></CardHeader>
            <CardContent className="text-3xl font-semibold tracking-tight">{c.v ?? "—"}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}