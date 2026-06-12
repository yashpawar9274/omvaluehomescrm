import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { FLAT_TYPES, LEAD_SOURCES, labelOf } from "@/lib/crm-helpers";

export const Route = createFileRoute("/_authenticated/analytics")({ component: AnalyticsPage });

const COLORS = ["oklch(0.48 0.13 162)", "oklch(0.65 0.17 162)", "oklch(0.72 0.15 90)", "oklch(0.55 0.18 35)", "oklch(0.4 0.08 200)"];

function AnalyticsPage() {
  const { data: byBhk = [] } = useQuery({
    queryKey: ["analytics-bhk"],
    queryFn: async () => {
      const { data } = await supabase.from("visits").select("flat_type");
      const counts: Record<string, number> = {};
      (data ?? []).forEach((v: any) => { if (v.flat_type) counts[v.flat_type] = (counts[v.flat_type] ?? 0) + 1; });
      return FLAT_TYPES.map((t) => ({ name: t.l, value: counts[t.v] ?? 0 })).filter((x) => x.value > 0);
    },
  });

  const { data: bySource = [] } = useQuery({
    queryKey: ["analytics-source"],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("source");
      const counts: Record<string, number> = {};
      (data ?? []).forEach((l: any) => { if (l.source) counts[l.source] = (counts[l.source] ?? 0) + 1; });
      return LEAD_SOURCES.map((s) => ({ name: s.l, leads: counts[s.v] ?? 0 }));
    },
  });

  return (
    <div>
      <PageHeader title="Customer Preference Analytics" subtitle="Understand demand by property type and channel." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Visits by property type</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byBhk} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                  {byBhk.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Leads by source</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer>
              <BarChart data={bySource}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" fontSize={11} angle={-20} textAnchor="end" height={60} interval={0} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="leads" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}