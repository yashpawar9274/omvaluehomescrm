import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, UserPlus, Phone, Upload, PhoneCall, CheckCircle2, MessageCircle, Eye, Mail, MapPin, Calendar, IndianRupee } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { LEAD_SOURCES, LEAD_STATUSES, FLAT_TYPES, CALL_RESPONSES, labelOf } from "@/lib/crm-helpers";
import { useRole } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/leads")({ component: LeadsPage });

function LeadsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [callLead, setCallLead] = useState<any | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
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

  // Group leads by created date: Today / Yesterday / Older
  const todayStr = new Date().toISOString().slice(0, 10);
  const yStr = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
  const groups: Record<string, any[]> = { Today: [], Yesterday: [], Older: [] };
  filtered.forEach((l: any) => {
    const d = (l.created_at ?? "").slice(0, 10);
    if (d === todayStr) groups.Today.push(l);
    else if (d === yStr) groups.Yesterday.push(l);
    else groups.Older.push(l);
  });

  const [detailLead, setDetailLead] = useState<any | null>(null);
  const waLink = (mobile: string) => {
    const num = String(mobile).replace(/[^\d]/g, "");
    const phone = num.length === 10 ? `91${num}` : num;
    return `https://wa.me/${phone}`;
  };

  const assignTo = async (leadId: string, userId: string) => {
    const { error } = await supabase.from("leads").update({ assigned_to: userId }).eq("id", leadId);
    if (error) return toast.error(error.message);
    toast.success("Lead assigned");
    qc.invalidateQueries({ queryKey: ["leads"] });
  };

  const importFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "", raw: false });
      if (!rows.length) return toast.error("File is empty");
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      const norm = (s: any) => String(s ?? "").trim().toLowerCase().replace(/[\s_\-.]+/g, "");
      const flatMap: Record<string, string> = { "1bhk": "1bhk", "1": "1bhk", "1rk": "1bhk", "2bhk": "2bhk", "2": "2bhk", "3bhk": "3bhk", "3": "3bhk", "shop": "shop", "office": "office" };
      const NAME_KEYS = ["name","customername","customer","fullname","clientname","client","leadname","contactname"];
      const PHONE_KEYS = ["mobile","phone","phonenumber","contact","contactnumber","mobilenumber","number","mob","cell","whatsapp","whatsappnumber","tel"];
      const EMAIL_KEYS = ["email","mail","emailid","emailaddress"];
      const CITY_KEYS = ["city","location","address","area","place"];
      const FLAT_KEYS = ["flat","flattype","bhk","requirement","need","unit","type","propertytype"];
      const SRC_KEYS = ["source","leadsource","via","channel"];
      const BMIN_KEYS = ["budgetmin","minbudget","budget","budgetfrom","pricemin"];
      const BMAX_KEYS = ["budgetmax","maxbudget","budgetto","pricemax"];
      const pickKey = (row: any, keys: string[]) => {
        for (const k of Object.keys(row)) if (keys.includes(norm(k))) {
          const v = row[k];
          if (v !== null && v !== undefined && String(v).trim() !== "") return v;
        }
        return "";
      };
      const extractPhone = (row: any) => {
        const direct = pickKey(row, PHONE_KEYS);
        if (direct) return String(direct).replace(/[^\d+]/g, "");
        // fallback: any value that looks like a phone
        for (const k of Object.keys(row)) {
          const v = String(row[k] ?? "");
          const digits = v.replace(/[^\d]/g, "");
          if (digits.length >= 7 && digits.length <= 15 && !/@/.test(v)) return digits;
        }
        return "";
      };
      const extractEmail = (row: any) => {
        const direct = pickKey(row, EMAIL_KEYS);
        if (direct) return String(direct).trim();
        for (const k of Object.keys(row)) {
          const v = String(row[k] ?? "");
          if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return v.trim();
        }
        return "";
      };
      let skipped = 0;
      const records = rows.map((r) => {
        const name = String(pickKey(r, NAME_KEYS) || "").trim();
        const mobile = extractPhone(r);
        const email = extractEmail(r);
        const city = String(pickKey(r, CITY_KEYS) || "").trim();
        const flat = norm(pickKey(r, FLAT_KEYS));
        const source = norm(pickKey(r, SRC_KEYS));
        const budgetMin = pickKey(r, BMIN_KEYS);
        const budgetMax = pickKey(r, BMAX_KEYS);
        // Need at least one identifier
        if (!name && !mobile && !email) { skipped++; return null; }
        return {
          customer_name: name || (email ? email.split("@")[0] : (city || "Unnamed")),
          mobile: mobile || "N/A",
          email: email || null,
          city: city || null,
          flat_type: flat && flatMap[flat] ? flatMap[flat] : null,
          source: source || "website",
          status: "new",
          budget_min: budgetMin ? Number(String(budgetMin).replace(/[^\d.]/g, "")) || null : null,
          budget_max: budgetMax ? Number(String(budgetMax).replace(/[^\d.]/g, "")) || null : null,
          created_by: uid,
          assigned_to: uid,
        };
      }).filter(Boolean) as any[];
      if (!records.length) return toast.error("No usable rows found in file");
      const { error } = await supabase.from("leads").insert(records as any);
      if (error) return toast.error(error.message);
      toast.success(`Imported ${records.length} leads${skipped ? ` (${skipped} skipped)` : ""}`);
      qc.invalidateQueries({ queryKey: ["leads"] });
    } catch (e: any) {
      toast.error(e.message ?? "Import failed");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      <PageHeader title="Leads" subtitle={isAdmin ? "All leads — assign to team." : "Your assigned leads."}
        action={
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); }} />
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-1 h-4 w-4" />Import
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" />New</Button></DialogTrigger>
              <LeadDialog isAdmin={isAdmin} team={team} onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["leads"] }); }} />
            </Dialog>
          </div>
        }
      />
      <div className="mb-3 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by name or mobile" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <p className="mb-2 text-[11px] text-muted-foreground">
        Import accepts CSV/Excel with columns: name, mobile, email, city, flat (1bhk/2bhk/3bhk/shop/office), source, budget.
      </p>
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No leads yet.
          </div>
        ) : (["Today","Yesterday","Older"] as const).map((g) => groups[g].length === 0 ? null : (
          <div key={g} className="space-y-2">
            <div className="sticky top-0 z-10 -mx-1 bg-background/95 px-1 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
              {g} · {groups[g].length}
            </div>
            {groups[g].map((l: any) => {
          const assignee = team.find((t: any) => t.id === l.assigned_to);
          return (
            <div key={l.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <button className="min-w-0 flex-1 text-left" onClick={() => setDetailLead(l)}>
                  <div className="font-semibold truncate">{l.customer_name}</div>
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-primary">
                    <Phone className="h-3 w-3" />{l.mobile}
                  </div>
                </button>
                <Badge variant="secondary" className="shrink-0">{labelOf(LEAD_STATUSES, l.status)}</Badge>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <div><span className="text-foreground/70">City:</span> {l.city ?? "—"}</div>
                <div><span className="text-foreground/70">Source:</span> {labelOf(LEAD_SOURCES, l.source)}</div>
                <div><span className="text-foreground/70">Need:</span> {labelOf(FLAT_TYPES, l.flat_type)}</div>
                <div className="col-span-2"><span className="text-foreground/70">Budget:</span> {l.budget_min ? `₹${l.budget_min} – ₹${l.budget_max ?? "?"}` : "—"}</div>
              </div>
              {l.last_call_response && (
                <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-accent/40 px-2 py-1 text-[11px]">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                  <span className="font-medium">Last call:</span>
                  <span className="text-muted-foreground">{labelOf(CALL_RESPONSES, l.last_call_response)}</span>
                  {l.last_called_at && <span className="ml-auto text-muted-foreground">{new Date(l.last_called_at).toLocaleDateString()}</span>}
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <a href={`tel:${l.mobile}`} className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">
                  <Phone className="mr-1 h-3 w-3" />Call
                </a>
                <a href={waLink(l.mobile)} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center rounded-md bg-[#25D366] px-3 text-xs font-medium text-white">
                  <MessageCircle className="mr-1 h-3 w-3" />WhatsApp
                </a>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setCallLead(l)}>
                  <PhoneCall className="mr-1 h-3 w-3" />Log response
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setDetailLead(l)}>
                  <Eye className="mr-1 h-3 w-3" />Details
                </Button>
              </div>
              {isAdmin ? (
                <div className="mt-2 flex items-center gap-2">
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
        ))}
      </div>
      <CallLogDialog lead={callLead} onClose={() => setCallLead(null)} onSaved={() => { setCallLead(null); qc.invalidateQueries({ queryKey: ["leads"] }); }} />
      <LeadDetailDialog lead={detailLead} team={team} onClose={() => setDetailLead(null)} />
    </div>
  );
}

function LeadDialog({ onDone, isAdmin, team }: { onDone: () => void; isAdmin: boolean; team: any[] }) {
  const [form, setForm] = useState({ customer_name: "", mobile: "", email: "", city: "", budget_min: "", budget_max: "", source: "website", status: "new", assigned_to: "", flat_type: "" });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!form.customer_name.trim() || !form.mobile.trim()) {
      toast.error("Customer name and mobile are required");
      return;
    }
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const assignedTo = isAdmin && form.assigned_to ? form.assigned_to : u.user?.id;
    const { error } = await supabase.from("leads").insert([{
      customer_name: form.customer_name.trim(),
      mobile: form.mobile.trim(),
      email: form.email || null,
      city: form.city || null,
      budget_min: form.budget_min ? Number(form.budget_min) : null,
      budget_max: form.budget_max ? Number(form.budget_max) : null,
      source: form.source as any,
      status: form.status as any,
      flat_type: ((form.flat_type || null) as any),
      created_by: u.user?.id,
      assigned_to: assignedTo,
    } as any]);
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
        <Field label="Flat requirement">
          <Select value={form.flat_type} onValueChange={(v) => setForm({ ...form, flat_type: v })}>
            <SelectTrigger><SelectValue placeholder="Select flat type" /></SelectTrigger>
            <SelectContent>{FLAT_TYPES.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
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

function CallLogDialog({ lead, onClose, onSaved }: { lead: any | null; onClose: () => void; onSaved: () => void }) {
  const [response, setResponse] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!lead) return;
    if (!response) return toast.error("Pick a response");
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("call_logs").insert({
      lead_id: lead.id,
      employee_id: u.user!.id,
      response,
      notes: notes || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Call logged");
    setResponse(""); setNotes("");
    onSaved();
  };
  return (
    <Dialog open={!!lead} onOpenChange={(o) => { if (!o) { onClose(); setResponse(""); setNotes(""); } }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Log call — {lead?.customer_name}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <Field label="Response *">
            <Select value={response} onValueChange={setResponse}>
              <SelectTrigger><SelectValue placeholder="What was the outcome?" /></SelectTrigger>
              <SelectContent>{CALL_RESPONSES.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Notes"><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything to remember…" /></Field>
        </div>
        <DialogFooter><Button onClick={save} disabled={busy} className="w-full">Save call log</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}

function LeadDetailDialog({ lead, team, onClose }: { lead: any | null; team: any[]; onClose: () => void }) {
  const { data: calls = [] } = useQuery({
    queryKey: ["call-logs", lead?.id],
    enabled: !!lead?.id,
    queryFn: async () => {
      const { data } = await (supabase as any).from("call_logs").select("*").eq("lead_id", lead.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const { data: visits = [] } = useQuery({
    queryKey: ["lead-visits", lead?.id],
    enabled: !!lead?.id,
    queryFn: async () => {
      const { data } = await supabase.from("visits").select("*").eq("mobile", lead.mobile).order("visit_date", { ascending: false });
      return data ?? [];
    },
  });
  if (!lead) return null;
  const assignee = team.find((t: any) => t.id === lead.assigned_to);
  const waNum = String(lead.mobile ?? "").replace(/[^\d]/g, "");
  const waPhone = waNum.length === 10 ? `91${waNum}` : waNum;
  return (
    <Dialog open={!!lead} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{lead.customer_name}</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <a href={`tel:${lead.mobile}`} className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"><Phone className="mr-1 h-3 w-3" />Call</a>
            <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center rounded-md bg-[#25D366] px-3 text-xs font-medium text-white"><MessageCircle className="mr-1 h-3 w-3" />WhatsApp</a>
            {lead.email && <a href={`mailto:${lead.email}`} className="inline-flex h-8 items-center rounded-md border px-3 text-xs"><Mail className="mr-1 h-3 w-3" />Email</a>}
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-accent/40 p-3 text-xs">
            <Info icon={<Phone className="h-3 w-3" />} label="Mobile" value={lead.mobile} />
            <Info icon={<Mail className="h-3 w-3" />} label="Email" value={lead.email ?? "—"} />
            <Info icon={<MapPin className="h-3 w-3" />} label="City" value={lead.city ?? "—"} />
            <Info icon={<CheckCircle2 className="h-3 w-3" />} label="Status" value={labelOf(LEAD_STATUSES, lead.status)} />
            <Info icon={<MapPin className="h-3 w-3" />} label="Need" value={labelOf(FLAT_TYPES, lead.flat_type)} />
            <Info icon={<MapPin className="h-3 w-3" />} label="Source" value={labelOf(LEAD_SOURCES, lead.source)} />
            <Info icon={<IndianRupee className="h-3 w-3" />} label="Budget" value={lead.budget_min ? `₹${lead.budget_min} – ₹${lead.budget_max ?? "?"}` : "—"} />
            <Info icon={<Calendar className="h-3 w-3" />} label="Added" value={new Date(lead.created_at).toLocaleDateString()} />
            <Info icon={<UserPlus className="h-3 w-3" />} label="Assigned" value={assignee?.name || assignee?.email || "—"} />
          </div>

          <div>
            <div className="mb-1.5 text-xs font-semibold text-muted-foreground">Call History ({calls.length})</div>
            {calls.length === 0 ? (
              <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">No calls logged yet.</div>
            ) : (
              <div className="space-y-1.5">
                {calls.map((c: any) => (
                  <div key={c.id} className="rounded-lg border border-border bg-card p-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{labelOf(CALL_RESPONSES, c.response)}</span>
                      <span className="text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    {c.notes && <div className="mt-0.5 text-muted-foreground">{c.notes}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-1.5 text-xs font-semibold text-muted-foreground">Site Visits ({visits.length})</div>
            {visits.length === 0 ? (
              <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">No visits yet.</div>
            ) : (
              <div className="space-y-1.5">
                {visits.map((v: any) => (
                  <div key={v.id} className="rounded-lg border border-border bg-card p-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{v.visit_date} {v.visit_time ?? ""}</span>
                      <Badge variant="secondary">{labelOf(FLAT_TYPES, v.flat_type)}</Badge>
                    </div>
                    <div className="text-muted-foreground">{[v.project_name, v.tower_name, v.wing].filter(Boolean).join(" · ") || "—"}</div>
                    {v.remarks && <div className="mt-0.5 text-muted-foreground">{v.remarks}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">{icon}{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}