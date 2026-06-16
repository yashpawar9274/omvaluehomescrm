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
        `You are the CRM assistant for OM Value Homes. Today is ${new Date().toISOString().slice(0, 10)}. ` +
        `The current user is ${isAdmin ? "an ADMIN (can manage all data)" : "a SALES user (only their own data)"}. ` +
        `Help them add/read/update/delete leads, visits and follow-ups using the provided tools. ` +
        `Confirm destructive actions briefly. Reply in the user's language (Hindi/Hinglish if they use it).`,
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
      },
    });

    return { text: result.text };
  });