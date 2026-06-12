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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BOOKING_STATUSES, labelOf } from "@/lib/crm-helpers";

export const Route = createFileRoute("/_authenticated/bookings")({ component: BookingsPage });

function BookingsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: rows = [] } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select("*, leads(customer_name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  return (
    <div>
      <PageHeader title="Bookings" subtitle="Token, confirmed, registered."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Booking</Button></DialogTrigger>
            <BookingDialog onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["bookings"] }); }} />
          </Dialog>
        }
      />
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Customer</TableHead><TableHead>Flat</TableHead><TableHead>Amount</TableHead>
            <TableHead>Date</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No bookings yet.</TableCell></TableRow>
            ) : rows.map((b: any) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.leads?.customer_name ?? "—"}</TableCell>
                <TableCell>{b.flat_number ?? "—"}</TableCell>
                <TableCell>{b.booking_amount ? `₹${Number(b.booking_amount).toLocaleString("en-IN")}` : "—"}</TableCell>
                <TableCell>{b.booking_date ?? "—"}</TableCell>
                <TableCell><Badge>{labelOf(BOOKING_STATUSES, b.status)}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function BookingDialog({ onDone }: { onDone: () => void }) {
  const [leadId, setLeadId] = useState("");
  const [flat, setFlat] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState("interested");
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
    const { error } = await supabase.from("bookings").insert({
      lead_id: leadId, employee_id: u.user?.id,
      flat_number: flat || null,
      booking_amount: amount ? Number(amount) : null,
      booking_date: date || null,
      status: status as any,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Booking saved");
    onDone();
  };
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>New booking</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid gap-1.5"><Label className="text-xs">Lead</Label>
          <Select value={leadId} onValueChange={setLeadId}>
            <SelectTrigger><SelectValue placeholder="Choose a lead" /></SelectTrigger>
            <SelectContent>{leads.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.customer_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5"><Label className="text-xs">Flat #</Label><Input value={flat} onChange={(e) => setFlat(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Amount (₹)</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BOOKING_STATUSES.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <DialogFooter><Button onClick={save} disabled={busy}>Save booking</Button></DialogFooter>
    </DialogContent>
  );
}