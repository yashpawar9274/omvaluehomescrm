import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRole } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/employees")({ component: EmployeesPage });

const ROLE_OPTIONS = [
  { v: "admin", l: "Admin" },
  { v: "manager", l: "Manager" },
  { v: "sales", l: "Sales" },
  { v: "super_receptionist", l: "Super Receptionist" },
] as const;

function EmployeesPage() {
  const qc = useQueryClient();
  const { data: role } = useRole();
  const isAdmin = !!role?.isAdmin;

  const { data: rows = [] } = useQuery({
    queryKey: ["team-with-roles"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      const { data: roles } = await supabase.from("user_roles").select("user_id,role");
      return (profiles ?? []).map((p: any) => ({
        ...p,
        roles: (roles ?? []).filter((r: any) => r.user_id === p.id).map((r: any) => r.role as string),
      }));
    },
  });

  // Stats per employee (leads count)
  const { data: leadCounts = {} } = useQuery({
    queryKey: ["lead-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("assigned_to");
      const map: Record<string, number> = {};
      (data ?? []).forEach((l: any) => { if (l.assigned_to) map[l.assigned_to] = (map[l.assigned_to] ?? 0) + 1; });
      return map;
    },
  });

  const setRole = async (userId: string, newRole: string, currentRoles: string[]) => {
    if (currentRoles.includes(newRole)) return;
    // Replace all roles with the chosen one (single primary role tag)
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole as any });
    if (error) return toast.error(error.message);
    toast.success("Role updated");
    qc.invalidateQueries({ queryKey: ["team-with-roles"] });
    qc.invalidateQueries({ queryKey: ["role"] });
  };

  return (
    <div>
      <PageHeader title="Team & Roles" subtitle="Tag each employee as Admin, Manager, Sales or Super Receptionist." />
      <div className="space-y-2">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">No employees yet.</div>
        ) : rows.map((p: any) => {
          const primary = p.roles[0] ?? "";
          return (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 font-semibold text-primary">
                  {(p.name || p.email).slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{p.name || "—"}</div>
                  <div className="truncate text-xs text-muted-foreground">{p.email}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold leading-tight">{leadCounts[p.id] ?? 0}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Leads</div>
                </div>
              </div>
              <div className="mt-3">
                {isAdmin ? (
                  <Select value={primary} onValueChange={(v) => setRole(p.id, v, p.roles)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Assign role" /></SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-xs text-muted-foreground">{ROLE_OPTIONS.find((r) => r.v === primary)?.l ?? "No role"}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}