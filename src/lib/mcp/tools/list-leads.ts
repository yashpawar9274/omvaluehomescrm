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
  name: "list_leads",
  title: "List leads",
  description:
    "List real-estate leads visible to the signed-in user. Optional filters: free-text query (matches name/mobile/city), status, and result limit.",
  inputSchema: {
    query: z.string().optional().describe("Substring to match on customer name, mobile, or city."),
    status: z
      .enum([
        "new",
        "contacted",
        "interested",
        "site_visit",
        "negotiation",
        "booking",
        "closed_won",
        "closed_lost",
      ])
      .optional(),
    limit: z.number().int().min(1).max(50).default(20),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let q = userClient(ctx)
      .from("leads")
      .select(
        "id,customer_name,mobile,email,city,status,flat_type,source,last_call_response,assigned_to,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    if (status) q = q.eq("status", status);
    if (query) q = q.or(`customer_name.ilike.%${query}%,mobile.ilike.%${query}%,city.ilike.%${query}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { leads: data ?? [] },
    };
  },
});