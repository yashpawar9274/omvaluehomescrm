import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function userClient(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_follow_ups",
  title: "List follow-ups",
  description: "List follow-up reminders (call/visit) visible to the signed-in user.",
  inputSchema: {
    scope: z.enum(["today", "pending", "overdue", "all"]).default("today"),
    limit: z.number().int().min(1).max(50).default(20),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ scope, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const today = new Date().toISOString().slice(0, 10);
    let q = userClient(ctx)
      .from("follow_ups")
      .select("id,lead_id,next_call_date,next_visit_date,notes,status,employee_id")
      .order("next_call_date", { ascending: true, nullsFirst: false })
      .limit(limit);
    if (scope === "today") q = q.or(`next_call_date.eq.${today},next_visit_date.eq.${today}`);
    else if (scope === "pending") q = q.eq("status", "pending");
    else if (scope === "overdue") q = q.eq("status", "overdue");
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { follow_ups: data ?? [] },
    };
  },
});