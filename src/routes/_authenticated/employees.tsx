import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/employees")({ component: EmployeesPage });

function EmployeesPage() {
  const { data: rows = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  return (
    <div>
      <PageHeader title="Employees" subtitle="Team members are added automatically on sign-up. First sign-up becomes Admin." />
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Mobile</TableHead>
            <TableHead>Designation</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No employees yet.</TableCell></TableRow>
            ) : rows.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name || "—"}</TableCell>
                <TableCell>{p.email}</TableCell>
                <TableCell>{p.mobile ?? "—"}</TableCell>
                <TableCell>{p.designation ?? "—"}</TableCell>
                <TableCell><Badge variant={p.active ? "default" : "secondary"}>{p.active ? "Active" : "Inactive"}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}