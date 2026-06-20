import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, tool, stepCountIs, type ModelMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

type ChatMessage = { role: "user" | "assistant"; content: string };

export const aiAssistantChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      messages: z.array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        }),
      ),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured");
    const { supabase, userId } = context;

    // Determine if user is admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const modelMessages: ModelMessage[] = (data.messages as ChatMessage[]).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const result = await generateText({
      model,
      system:
        `You are the smart CRM assistant for OM Value Homes (real-estate). Today is ${new Date().toISOString().slice(0, 10)}. ` +
        `Current user: ${isAdmin ? "ADMIN — can manage all data." : "SALES — only their own data."} ` +
        `Capabilities: search/add/edit/delete leads, schedule/reschedule/cancel site visits, manage follow-ups, analyse leads and give better-lead suggestions, and answer any general or CRM question in Hindi/Hinglish/English. ` +
        `Always be helpful: if the user asks a general question (e.g. real-estate advice, sales tips, what to say to a client) answer directly. If they want an action, use the tools. ` +
        `When listing leads or visits, summarise neatly (name + mobile + status) and offer next steps. ` +
        `For "better leads" / suggestions: call analyseLeads then explain which leads to prioritise and why (hot interest, recent calls, budget match, missed follow-ups). ` +
        `Confirm destructive actions (delete/cancel) briefly before doing them, unless the user clearly said "delete X" with an id. ` +
        `Reply in the user's language.`,
      messages: modelMessages,
      stopWhen: stepCountIs(50),
      tools: {
        searchLeads: tool({
          description: "Search leads by name, mobile, city or status. Returns matching leads.",
          inputSchema: z.object({
            query: z.string().optional().describe("Name, mobile or city to filter"),
            status: z.string().optional(),
            limit: z.number().int().min(1).max(50).default(10),
          }),
          execute: async ({ query, status, limit }) => {
            let q = supabase.from("leads").select("id,customer_name,mobile,email,city,status,flat_type,source,last_call_response,assigned_to,created_at").order("created_at", { ascending: false }).limit(limit);
            if (status) q = q.eq("status", status as never);
            if (query) q = q.or(`customer_name.ilike.%${query}%,mobile.ilike.%${query}%,city.ilike.%${query}%`);
            const { data, error } = await q;
            if (error) return { error: error.message };
            return { leads: data };
          },
        }),
        createLead: tool({
          description: "Create a new lead.",
          inputSchema: z.object({
            customer_name: z.string(),
            mobile: z.string(),
            email: z.string().optional(),
            city: z.string().optional(),
            flat_type: z.enum(["1bhk", "2bhk", "3bhk", "shop", "office"]).optional(),
            source: z.string().optional(),
            budget_min: z.number().optional(),
            budget_max: z.number().optional(),
          }),
          execute: async (input) => {
            const { data, error } = await supabase.from("leads").insert({
              customer_name: input.customer_name,
              mobile: input.mobile,
              email: input.email ?? null,
              city: input.city ?? null,
              flat_type: (input.flat_type ?? null) as never,
              source: (input.source ?? "website") as never,
              status: "new" as never,
              budget_min: input.budget_min ?? null,
              budget_max: input.budget_max ?? null,
              created_by: userId,
              assigned_to: userId,
            } as never).select().single();
            if (error) return { error: error.message };
            return { ok: true, lead: data };
          },
        }),
        updateLead: tool({
          description: "Update a lead's status, assignment or details by id.",
          inputSchema: z.object({
            id: z.string().uuid(),
            status: z.string().optional(),
            customer_name: z.string().optional(),
            mobile: z.string().optional(),
            city: z.string().optional(),
            flat_type: z.enum(["1bhk", "2bhk", "3bhk", "shop", "office"]).optional(),
          }),
          execute: async ({ id, ...patch }) => {
            const clean: Record<string, unknown> = {};
            Object.entries(patch).forEach(([k, v]) => { if (v !== undefined) clean[k] = v; });
            const { error } = await supabase.from("leads").update(clean as never).eq("id", id);
            if (error) return { error: error.message };
            return { ok: true };
          },
        }),
        deleteLead: tool({
          description: "Delete a lead by id. Only admin can delete others' leads.",
          inputSchema: z.object({ id: z.string().uuid() }),
          execute: async ({ id }) => {
            const { error } = await supabase.from("leads").delete().eq("id", id);
            if (error) return { error: error.message };
            return { ok: true };
          },
        }),
        listVisits: tool({
          description: "List upcoming or recent site visits.",
          inputSchema: z.object({
            scope: z.enum(["today", "upcoming", "past", "all"]).default("all"),
            limit: z.number().int().min(1).max(50).default(20),
          }),
          execute: async ({ scope, limit }) => {
            const today = new Date().toISOString().slice(0, 10);
            let q = supabase.from("visits").select("id,customer_name,mobile,visit_date,visit_time,project_name,flat_type,interest_level").order("visit_date", { ascending: false }).limit(limit);
            if (scope === "today") q = q.eq("visit_date", today);
            if (scope === "upcoming") q = q.gt("visit_date", today);
            if (scope === "past") q = q.lt("visit_date", today);
            const { data, error } = await q;
            if (error) return { error: error.message };
            return { visits: data };
          },
        }),
        scheduleFollowUp: tool({
          description: "Create a follow-up reminder for a lead (call or visit).",
          inputSchema: z.object({
            lead_id: z.string().uuid(),
            next_call_date: z.string().optional().describe("YYYY-MM-DD"),
            next_visit_date: z.string().optional().describe("YYYY-MM-DD"),
            notes: z.string().optional(),
          }),
          execute: async (input) => {
            const { error } = await supabase.from("follow_ups").insert({
              lead_id: input.lead_id,
              employee_id: userId,
              next_call_date: input.next_call_date ?? null,
              next_visit_date: input.next_visit_date ?? null,
              notes: input.notes ?? null,
              status: "pending" as never,
            } as never);
            if (error) return { error: error.message };
            return { ok: true };
          },
        }),
        scheduleVisit: tool({
          description: "Schedule a new site visit for a customer.",
          inputSchema: z.object({
            customer_name: z.string(),
            mobile: z.string(),
            visit_date: z.string().describe("YYYY-MM-DD"),
            visit_time: z.string().optional().describe("HH:MM"),
            project_name: z.string().optional(),
            flat_type: z.enum(["1bhk","2bhk","3bhk","shop","office"]).optional(),
            remarks: z.string().optional(),
          }),
          execute: async (input) => {
            const { error } = await supabase.from("visits").insert({
              employee_id: userId,
              customer_name: input.customer_name,
              mobile: input.mobile,
              visit_date: input.visit_date,
              visit_time: input.visit_time ?? null,
              project_name: input.project_name ?? null,
              flat_type: (input.flat_type ?? null) as never,
              interest_level: "warm" as never,
              remarks: input.remarks ?? null,
            } as never);
            if (error) return { error: error.message };
            return { ok: true };
          },
        }),
        rescheduleVisit: tool({
          description: "Reschedule (change date/time of) a site visit by id.",
          inputSchema: z.object({
            id: z.string().uuid(),
            visit_date: z.string().describe("YYYY-MM-DD"),
            visit_time: z.string().optional(),
            remarks: z.string().optional(),
          }),
          execute: async ({ id, visit_date, visit_time, remarks }) => {
            const patch: Record<string, unknown> = { visit_date };
            if (visit_time !== undefined) patch.visit_time = visit_time;
            if (remarks !== undefined) patch.remarks = remarks;
            const { error } = await supabase.from("visits").update(patch as never).eq("id", id);
            if (error) return { error: error.message };
            return { ok: true };
          },
        }),
        cancelVisit: tool({
          description: "Cancel (delete) a site visit by id.",
          inputSchema: z.object({ id: z.string().uuid() }),
          execute: async ({ id }) => {
            const { error } = await supabase.from("visits").delete().eq("id", id);
            if (error) return { error: error.message };
            return { ok: true };
          },
        }),
        listFollowUps: tool({
          description: "List pending or overdue follow-ups for the current user (or all if admin).",
          inputSchema: z.object({
            scope: z.enum(["today","pending","overdue","all"]).default("pending"),
            limit: z.number().int().min(1).max(50).default(20),
          }),
          execute: async ({ scope, limit }) => {
            const today = new Date().toISOString().slice(0, 10);
            let q = supabase.from("follow_ups").select("id,lead_id,next_call_date,next_visit_date,notes,status,employee_id").order("next_call_date", { ascending: true }).limit(limit);
            if (scope === "today") q = q.or(`next_call_date.eq.${today},next_visit_date.eq.${today}`);
            if (scope === "pending") q = q.eq("status", "pending" as never);
            if (scope === "overdue") q = q.eq("status", "overdue" as never);
            const { data, error } = await q;
            if (error) return { error: error.message };
            return { followUps: data };
          },
        }),
        completeFollowUp: tool({
          description: "Mark a follow-up as completed by id.",
          inputSchema: z.object({ id: z.string().uuid() }),
          execute: async ({ id }) => {
            const { error } = await supabase.from("follow_ups").update({ status: "completed" as never } as never).eq("id", id);
            if (error) return { error: error.message };
            return { ok: true };
          },
        }),
        analyseLeads: tool({
          description: "Analyse all visible leads and return prioritised 'better leads' with reasons (hot interest, recent positive call, budget present, recently created, assigned follow-up due).",
          inputSchema: z.object({ limit: z.number().int().min(1).max(20).default(10) }),
          execute: async ({ limit }) => {
            const { data: leads, error } = await supabase
              .from("leads")
              .select("id,customer_name,mobile,status,last_call_response,last_called_at,budget_min,budget_max,city,flat_type,created_at,assigned_to")
              .order("created_at", { ascending: false })
              .limit(200);
            if (error) return { error: error.message };
            const now = Date.now();
            const scored = (leads ?? []).map((l: any) => {
              let score = 0; const reasons: string[] = [];
              if (["interested","site_visit","negotiation","booking"].includes(l.status)) { score += 30; reasons.push(`status: ${l.status}`); }
              if (l.last_call_response && ["interested","callback","site_visit"].includes(l.last_call_response)) { score += 20; reasons.push(`positive last call (${l.last_call_response})`); }
              if (l.budget_min || l.budget_max) { score += 10; reasons.push("budget known"); }
              if (l.flat_type) { score += 5; reasons.push(`needs ${l.flat_type}`); }
              const ageDays = (now - new Date(l.created_at).getTime()) / 86400000;
              if (ageDays < 3) { score += 15; reasons.push("fresh lead"); }
              else if (ageDays > 30 && !l.last_called_at) { score -= 10; reasons.push("cold, never called"); }
              if (l.last_called_at) {
                const since = (now - new Date(l.last_called_at).getTime()) / 86400000;
                if (since < 2) { score += 10; reasons.push("recently contacted"); }
              }
              return { id: l.id, name: l.customer_name, mobile: l.mobile, status: l.status, score, reasons };
            }).sort((a, b) => b.score - a.score).slice(0, limit);
            return { topLeads: scored };
          },
        }),
      },
    });

    return { text: result.text };
  });