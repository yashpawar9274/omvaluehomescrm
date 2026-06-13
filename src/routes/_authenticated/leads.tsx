import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, UserPlus, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LEAD_SOURCES, LEAD_STATUSES, labelOf } from "@/lib/crm-helpers";
import { useRole } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/leads")({ component: LeadsPage });

function LeadsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { data: role } = useRole();
  const isAdmin = !!role?.isAdmin;

  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: team = [] } = useQuery({
    queryKey: ["team"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id,name,email").order("name");
      return data ?? [];
    },
  });

  const filtered = leads.filter((l: any) =>
    !search || l.customer_name?.toLowerCase().includes(search.toLowerCase()) || l.mobile?.includes(search),
  );

  const assignTo = async (leadId: string, userId: string) => {
    const { error } = await supabase.from("leads").update({ assigned_to: userId }).eq("id", leadId);
    if (error) return toast.error(error.message);
    toast.success("Lead assigned");
    qc.invalidateQueries({ queryKey: ["leads"] });
  };

  return (
    <div>
      <PageHeader title="Leads" subtitle={isAdmin ? "All leads — assign to team." : "Your assigned leads."}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" />New</Button></DialogTrigger>
            <LeadDialog isAdmin={isAdmin} team={team} onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["leads"] }); }} />
          </Dialog>
        }
      />
      <div className="mb-3 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by name or mobile" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No leads yet.
          </div>
        ) : filtered.map((l: any) => {
          const assignee = team.find((t: any) => t.id === l.assigned_to);
          return (
            <div key={l.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{l.customer_name}</div>
                  <a href={`tel:${l.mobile}`} className="mt-0.5 flex items-center gap-1 text-xs text-primary">
                    <Phone className="h-3 w-3" />{l.mobile}
                  </a>
                </div>
                <Badge variant="secondary" className="shrink-0">{labelOf(LEAD_STATUSES, l.status)}</Badge>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <div><span className="text-foreground/70">City:</span> {l.city ?? "—"}</div>
                <div><span className="text-foreground/70">Source:</span> {labelOf(LEAD_SOURCES, l.source)}</div>
                <div className="col-span-2"><span className="text-foreground/70">Budget:</span> {l.budget_min ? `₹${l.budget_min} – ₹${l.budget_max ?? "?"}` : "—"}</div>
              </div>
              {isAdmin ? (
                <div className="mt-3 flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                  <Select value={l.assigned_to ?? ""} onValueChange={(v) => assignTo(l.id, v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Assign to employee" /></SelectTrigger>
                    <SelectContent>
                      {team.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>{t.name || t.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : assignee ? (
                <div className="mt-2 text-[11px] text-muted-foreground">Assigned: {assignee.name || assignee.email}</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LeadDialog({ onDone, isAdmin, team }: { onDone: () => void; isAdmin: boolean; team: any[] }) {
  const [form, setForm] = useState({ customer_name: "", mobile: "", email: "", city: "", budget_min: "", budget_max: "", source: "website", status: "new", assigned_to: "" });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!form.customer_name.trim() || !form.mobile.trim()) {
      toast.error("Customer name and mobile are required");
      return;
    }
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const assignedTo = isAdmin && form.assigned_to ? form.assigned_to : u.user?.id;
    const { error } = await supabase.from("leads").insert({
      customer_name: form.customer_name.trim(),
      mobile: form.mobile.trim(),
      email: form.email || null,
      city: form.city || null,
      budget_min: form.budget_min ? Number(form.budget_min) : null,
      budget_max: form.budget_max ? Number(form.budget_max) : null,
      source: form.source as any,
      status: form.status as any,
      created_by: u.user?.id,
      assigned_to: assignedTo,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Lead created");
    onDone();
  };
  return (
    <DialogContent className="max-h-[85vh] overflow-y-auto">
      <DialogHeader><DialogTitle>New Lead</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <Field label="Customer name *"><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></Field>
        <Field label="Mobile *"><Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></Field>
        <Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="City"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Budget min"><Input type="number" value={form.budget_min} onChange={(e) => setForm({ ...form, budget_min: e.target.value })} /></Field>
          <Field label="Budget max"><Input type="number" value={form.budget_max} onChange={(e) => setForm({ ...form, budget_max: e.target.value })} /></Field>
        </div>
        <Field label="Source">
          <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{LEAD_SOURCES.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Status">
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{LEAD_STATUSES.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        {isAdmin && (
          <Field label="Assign to employee">
            <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
              <SelectTrigger><SelectValue placeholder="Myself (default)" /></SelectTrigger>
              <SelectContent>
                {team.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name || t.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        )}
      </div>
      <DialogFooter><Button onClick={save} disabled={busy} className="w-full">Save lead</Button></DialogFooter>
    </DialogContent>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}