import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FLAT_TYPES, INTEREST_LEVELS, labelOf } from "@/lib/crm-helpers";

export const Route = createFileRoute("/_authenticated/visits")({ component: VisitsPage });

function VisitsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: visits = [] } = useQuery({
    queryKey: ["visits"],
    queryFn: async () => {
      const { data, error } = await supabase.from("visits").select("*").order("visit_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  return (
    <div>
      <PageHeader title="Site Visits" subtitle="Every walk-through, every detail."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Log Visit</Button></DialogTrigger>
            <VisitDialog onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["visits"] }); }} />
          </Dialog>
        }
      />
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Project</TableHead>
            <TableHead>Flat</TableHead><TableHead>Type</TableHead><TableHead>Interest</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {visits.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No visits logged yet.</TableCell></TableRow>
            ) : visits.map((v: any) => (
              <TableRow key={v.id}>
                <TableCell>{v.visit_date}</TableCell>
                <TableCell className="font-medium">{v.customer_name}</TableCell>
                <TableCell>{[v.project_name, v.tower_name, v.wing].filter(Boolean).join(" · ") || "—"}</TableCell>
                <TableCell>{v.flat_number ? `${v.flat_number} (Fl ${v.floor_number ?? "?"})` : "—"}</TableCell>
                <TableCell>{labelOf(FLAT_TYPES, v.flat_type)}</TableCell>
                <TableCell>
                  <Badge variant={v.interest_level === "hot" ? "default" : "secondary"}>{labelOf(INTEREST_LEVELS, v.interest_level)}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function VisitDialog({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({
    customer_name: "", mobile: "", project_name: "", tower_name: "", wing: "",
    visit_date: new Date().toISOString().slice(0, 10), visit_time: "",
    flat_type: "2bhk", flat_number: "", floor_number: "",
    budget_min: "", budget_max: "", interest_level: "warm", remarks: "",
  });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!f.customer_name.trim() || !f.mobile.trim() || !f.visit_date) { toast.error("Customer, mobile and date are required"); return; }
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("visits").insert({
      employee_id: u.user?.id,
      customer_name: f.customer_name.trim(), mobile: f.mobile.trim(),
      project_name: f.project_name || null, tower_name: f.tower_name || null, wing: f.wing || null,
      visit_date: f.visit_date, visit_time: f.visit_time || null,
      flat_type: f.flat_type as any, flat_number: f.flat_number || null, floor_number: f.floor_number || null,
      budget_min: f.budget_min ? Number(f.budget_min) : null, budget_max: f.budget_max ? Number(f.budget_max) : null,
      interest_level: f.interest_level as any, remarks: f.remarks || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Visit logged");
    onDone();
  };
  return (
    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Log Site Visit</DialogTitle></DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <Fld label="Customer *"><Input value={f.customer_name} onChange={(e) => setF({ ...f, customer_name: e.target.value })} /></Fld>
        <Fld label="Mobile *"><Input value={f.mobile} onChange={(e) => setF({ ...f, mobile: e.target.value })} /></Fld>
        <Fld label="Project"><Input value={f.project_name} onChange={(e) => setF({ ...f, project_name: e.target.value })} /></Fld>
        <Fld label="Tower"><Input value={f.tower_name} onChange={(e) => setF({ ...f, tower_name: e.target.value })} /></Fld>
        <Fld label="Wing"><Input value={f.wing} onChange={(e) => setF({ ...f, wing: e.target.value })} /></Fld>
        <Fld label="Date *"><Input type="date" value={f.visit_date} onChange={(e) => setF({ ...f, visit_date: e.target.value })} /></Fld>
        <Fld label="Time"><Input type="time" value={f.visit_time} onChange={(e) => setF({ ...f, visit_time: e.target.value })} /></Fld>
        <Fld label="Property type">
          <Select value={f.flat_type} onValueChange={(v) => setF({ ...f, flat_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{FLAT_TYPES.map((x) => <SelectItem key={x.v} value={x.v}>{x.l}</SelectItem>)}</SelectContent>
          </Select>
        </Fld>
        <Fld label="Flat #"><Input value={f.flat_number} onChange={(e) => setF({ ...f, flat_number: e.target.value })} /></Fld>
        <Fld label="Floor"><Input value={f.floor_number} onChange={(e) => setF({ ...f, floor_number: e.target.value })} /></Fld>
        <Fld label="Budget min"><Input type="number" value={f.budget_min} onChange={(e) => setF({ ...f, budget_min: e.target.value })} /></Fld>
        <Fld label="Budget max"><Input type="number" value={f.budget_max} onChange={(e) => setF({ ...f, budget_max: e.target.value })} /></Fld>
        <Fld label="Interest level">
          <Select value={f.interest_level} onValueChange={(v) => setF({ ...f, interest_level: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{INTEREST_LEVELS.map((x) => <SelectItem key={x.v} value={x.v}>{x.l}</SelectItem>)}</SelectContent>
          </Select>
        </Fld>
        <div className="sm:col-span-2"><Fld label="Remarks"><Textarea rows={3} value={f.remarks} onChange={(e) => setF({ ...f, remarks: e.target.value })} placeholder="Customer liked 2BHK. Discussed loan options." /></Fld></div>
      </div>
      <DialogFooter><Button onClick={save} disabled={busy}>Save visit</Button></DialogFooter>
    </DialogContent>
  );
}

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}