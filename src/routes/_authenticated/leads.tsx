import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LEAD_SOURCES, LEAD_STATUSES, labelOf } from "@/lib/crm-helpers";

export const Route = createFileRoute("/_authenticated/leads")({ component: LeadsPage });

function LeadsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = leads.filter((l: any) =>
    !search || l.customer_name?.toLowerCase().includes(search.toLowerCase()) || l.mobile?.includes(search),
  );

  return (
    <div>
      <PageHeader title="Leads" subtitle="Manage and track all incoming leads."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Lead</Button></DialogTrigger>
            <LeadDialog onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["leads"] }); }} />
          </Dialog>
        }
      />
      <div className="mb-4 flex items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name or mobile" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead><TableHead>Mobile</TableHead><TableHead>City</TableHead>
              <TableHead>Budget</TableHead><TableHead>Source</TableHead><TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No leads yet.</TableCell></TableRow>
            ) : filtered.map((l: any) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.customer_name}</TableCell>
                <TableCell>{l.mobile}</TableCell>
                <TableCell>{l.city ?? "—"}</TableCell>
                <TableCell>{l.budget_min ? `₹${l.budget_min} – ₹${l.budget_max ?? "?"}` : "—"}</TableCell>
                <TableCell>{labelOf(LEAD_SOURCES, l.source)}</TableCell>
                <TableCell><Badge variant="secondary">{labelOf(LEAD_STATUSES, l.status)}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function LeadDialog({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ customer_name: "", mobile: "", email: "", city: "", budget_min: "", budget_max: "", source: "website", status: "new" });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!form.customer_name.trim() || !form.mobile.trim()) {
      toast.error("Customer name and mobile are required");
      return;
    }
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
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
      assigned_to: u.user?.id,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Lead created");
    onDone();
  };
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>New Lead</DialogTitle></DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Customer name *"><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></Field>
        <Field label="Mobile *"><Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></Field>
        <Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="City"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
        <Field label="Budget min"><Input type="number" value={form.budget_min} onChange={(e) => setForm({ ...form, budget_min: e.target.value })} /></Field>
        <Field label="Budget max"><Input type="number" value={form.budget_max} onChange={(e) => setForm({ ...form, budget_max: e.target.value })} /></Field>
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
      </div>
      <DialogFooter><Button onClick={save} disabled={busy}>Save lead</Button></DialogFooter>
    </DialogContent>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}