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
import { FOLLOWUP_STATUSES, labelOf } from "@/lib/crm-helpers";

export const Route = createFileRoute("/_authenticated/follow-ups")({ component: FollowUpsPage });

function FollowUpsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: items = [] } = useQuery({
    queryKey: ["follow_ups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("follow_ups").select("*, leads(customer_name)").order("next_call_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("follow_ups").update({ status: status as any }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["follow_ups"] });
  };
  return (
    <div>
      <PageHeader title="Follow-ups" subtitle="Pending calls and visits across your pipeline."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Schedule</Button></DialogTrigger>
            <FollowUpDialog onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["follow_ups"] }); }} />
          </Dialog>
        }
      />
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Lead</TableHead><TableHead>Next call</TableHead><TableHead>Next visit</TableHead>
            <TableHead>Notes</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No follow-ups.</TableCell></TableRow>
            ) : items.map((f: any) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.leads?.customer_name ?? "—"}</TableCell>
                <TableCell>{f.next_call_date ?? "—"}</TableCell>
                <TableCell>{f.next_visit_date ?? "—"}</TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">{f.notes}</TableCell>
                <TableCell><Badge variant={f.status === "completed" ? "default" : "secondary"}>{labelOf(FOLLOWUP_STATUSES, f.status)}</Badge></TableCell>
                <TableCell>
                  <Select value={f.status} onValueChange={(v) => setStatus(f.id, v)}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{FOLLOWUP_STATUSES.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function FollowUpDialog({ onDone }: { onDone: () => void }) {
  const [leadId, setLeadId] = useState("");
  const [nextCall, setNextCall] = useState("");
  const [nextVisit, setNextVisit] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: leads = [] } = useQuery({
    queryKey: ["leads-lite"],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("id, customer_name").order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });
  const save = async () => {
    if (!leadId) return toast.error("Pick a lead");
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("follow_ups").insert({
      lead_id: leadId, employee_id: u.user?.id,
      next_call_date: nextCall || null, next_visit_date: nextVisit || null, notes: notes || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Follow-up scheduled");
    onDone();
  };
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Schedule follow-up</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid gap-1.5"><Label className="text-xs">Lead</Label>
          <Select value={leadId} onValueChange={setLeadId}>
            <SelectTrigger><SelectValue placeholder="Choose a lead" /></SelectTrigger>
            <SelectContent>{leads.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.customer_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5"><Label className="text-xs">Next call</Label><Input type="date" value={nextCall} onChange={(e) => setNextCall(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Next visit</Label><Input type="date" value={nextVisit} onChange={(e) => setNextVisit(e.target.value)} /></div>
        </div>
        <div className="grid gap-1.5"><Label className="text-xs">Notes</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      </div>
      <DialogFooter><Button onClick={save} disabled={busy}>Save</Button></DialogFooter>
    </DialogContent>
  );
}