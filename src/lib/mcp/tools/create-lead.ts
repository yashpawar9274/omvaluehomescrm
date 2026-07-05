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
  name: "create_lead",
  title: "Create lead",
  description: "Create a new real-estate lead assigned to the signed-in user.",
  inputSchema: {
    customer_name: z.string().min(1),
    mobile: z.string().min(6),
    email: z.string().email().optional(),
    city: z.string().optional(),
    flat_type: z.enum(["1bhk", "2bhk", "3bhk", "shop", "office"]).optional(),
    source: z.string().optional().describe("Lead source e.g. website, facebook, referral."),
    budget_min: z.number().optional(),
    budget_max: z.number().optional(),
    notes: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const uid = ctx.getUserId();
    const { data, error } = await userClient(ctx)
      .from("leads")
      .insert({
        customer_name: input.customer_name,
        mobile: input.mobile,
        email: input.email ?? null,
        city: input.city ?? null,
        flat_type: input.flat_type ?? null,
        source: input.source ?? "website",
        status: "new",
        budget_min: input.budget_min ?? null,
        budget_max: input.budget_max ?? null,
        notes: input.notes ?? null,
        created_by: uid,
        assigned_to: uid,
      })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Created lead ${data.id}` }],
      structuredContent: { lead: data },
    };
  },
});