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
  name: "list_visits",
  title: "List site visits",
  description: "List scheduled site visits visible to the signed-in user, filtered by time scope.",
  inputSchema: {
    scope: z.enum(["today", "upcoming", "past", "all"]).default("upcoming"),
    limit: z.number().int().min(1).max(50).default(20),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ scope, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const today = new Date().toISOString().slice(0, 10);
    let q = userClient(ctx)
      .from("visits")
      .select("id,customer_name,mobile,visit_date,visit_time,project_name,flat_type,interest_level,remarks")
      .order("visit_date", { ascending: true })
      .limit(limit);
    if (scope === "today") q = q.eq("visit_date", today);
    else if (scope === "upcoming") q = q.gte("visit_date", today);
    else if (scope === "past") q = q.lt("visit_date", today);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { visits: data ?? [] },
    };
  },
});