import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";

// Meta Lead Ads webhook
// 1. Verify subscription (GET) using META_VERIFY_TOKEN
// 2. Receive leadgen events (POST), validate X-Hub-Signature-256, fetch lead from Graph API, insert into leads

export const Route = createFileRoute("/api/public/meta-webhook")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        if (mode === "subscribe" && token && token === process.env.META_VERIFY_TOKEN) {
          return new Response(challenge ?? "", { status: 200 });
        }
        return new Response("Forbidden", { status: 403 });
      },
      POST: async ({ request }) => {
        const raw = await request.text();
        const sig = request.headers.get("x-hub-signature-256") ?? "";
        const secret = process.env.META_APP_SECRET;
        if (!secret) return new Response("Not configured", { status: 500 });

        const expected = "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
        const a = Buffer.from(sig);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let body: { entry?: Array<{ changes?: Array<{ field?: string; value?: { leadgen_id?: string; form_id?: string; page_id?: string } }> }> };
        try { body = JSON.parse(raw); } catch { return new Response("Bad JSON", { status: 400 }); }

        const token = process.env.META_PAGE_ACCESS_TOKEN;
        if (!token) return new Response("Missing page token", { status: 500 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const inserts: Array<Record<string, unknown>> = [];
        for (const entry of body.entry ?? []) {
          for (const change of entry.changes ?? []) {
            if (change.field !== "leadgen") continue;
            const leadgenId = change.value?.leadgen_id;
            if (!leadgenId) continue;
            try {
              const r = await fetch(`https://graph.facebook.com/v19.0/${leadgenId}?access_token=${encodeURIComponent(token)}`);
              if (!r.ok) continue;
              const lead = await r.json() as { field_data?: Array<{ name: string; values: string[] }> };
              const fields: Record<string, string> = {};
              for (const f of lead.field_data ?? []) fields[f.name.toLowerCase()] = (f.values?.[0] ?? "").toString();
              const name = fields["full_name"] || fields["name"] || fields["first_name"] || "Facebook Lead";
              const phone = (fields["phone_number"] || fields["phone"] || "").replace(/[^\d+]/g, "") || "N/A";
              const email = fields["email"] || null;
              const city = fields["city"] || fields["location"] || null;
              inserts.push({
                customer_name: name,
                mobile: phone,
                email,
                city,
                source: "facebook_ads",
                status: "new",
              });
            } catch {
              // ignore individual lead failures
            }
          }
        }

        if (inserts.length) {
          await supabaseAdmin.from("leads").insert(inserts as never);
        }
        return new Response("ok", { status: 200 });
      },
    },
  },
});