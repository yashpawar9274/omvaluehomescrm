import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";

// WhatsApp Cloud API webhook
// GET: verification using META_VERIFY_TOKEN
// POST: receive messages, store, generate human-like AI reply (Hindi/Hinglish),
//       auto-create lead, guide next steps, handoff on request.

type WAMessage = {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  button?: { text: string };
  interactive?: { button_reply?: { title: string }; list_reply?: { title: string } };
};

type WAValue = {
  metadata?: { phone_number_id?: string; display_phone_number?: string };
  contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
  messages?: WAMessage[];
};

type WAPayload = {
  entry?: Array<{ changes?: Array<{ field?: string; value?: WAValue }> }>;
};

const SYSTEM_PROMPT = `Aap "Neha" hain — OM Value Homes real estate ki friendly sales advisor.
Hindi/Hinglish mein baat karti ho, natural aur short replies (2-4 lines max, WhatsApp ki tarah).
Emojis kabhi kabhi (jyada nahi). Robotic feel bilkul nahi.

Aapka goal — customer ko step by step guide karna:
1. Warm greeting + naam poochho (agar naam nahi pata).
2. Requirement samjho: budget, BHK, location preference, purpose (investment/end-use).
3. 1-2 relevant projects suggest karo (Om Sai Residency Panvel, Om Green Vista Karjat, Om Skyline Thane — 1BHK 35L se, 2BHK 55L se).
4. Site visit ke liye offer do — date/time poochho.
5. Agar customer "human", "agent", "sales person", "call me", "manager", "baat karni hai" bole to handoff.

RULES:
- Ek time pe ek hi question puchho.
- Kabhi price/details invent mat karo — approximate range hi do.
- English words natural jagah use karo (site visit, budget, location).
- Reply hamesha WhatsApp message jaisa short rakho.

Response JSON format mein do:
{
  "reply": "customer ko bhejne wala message",
  "extracted": { "name": string|null, "budget": string|null, "bhk": string|null, "location": string|null, "purpose": string|null, "visit_date": string|null },
  "handoff": boolean,
  "stage": "greeting"|"qualifying"|"suggesting"|"scheduling"|"handoff"|"closed"
}`;

const HANDOFF_KEYWORDS = ["human", "agent", "sales person", "salesperson", "manager", "call me", "baat karni", "baat karo", "insaan", "aadmi se", "person se"];

async function sendWhatsAppText(to: string, body: string) {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_PAGE_ACCESS_TOKEN;
  if (!phoneId || !token) return { ok: false, error: "WhatsApp not configured" };
  const r = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { preview_url: false, body },
    }),
  });
  const json = await r.json().catch(() => ({}));
  return { ok: r.ok, response: json };
}

type AiOut = {
  reply: string;
  extracted?: { name?: string | null; budget?: string | null; bhk?: string | null; location?: string | null; purpose?: string | null; visit_date?: string | null };
  handoff?: boolean;
  stage?: string;
};

async function generateReply(history: Array<{ role: "user" | "assistant"; content: string }>, contextSummary: string): Promise<AiOut> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");

  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "system", content: `Known context so far: ${contextSummary}` },
        ...history,
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`AI gateway ${r.status}: ${t}`);
  }
  const data = await r.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content) as AiOut;
  } catch {
    return { reply: content.slice(0, 500) };
  }
}

export const Route = createFileRoute("/api/public/whatsapp-webhook")({
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
        if (secret) {
          const expected = "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
          const a = Buffer.from(sig);
          const b = Buffer.from(expected);
          if (a.length !== b.length || !timingSafeEqual(a, b)) {
            return new Response("Invalid signature", { status: 401 });
          }
        }

        let body: WAPayload;
        try { body = JSON.parse(raw) as WAPayload; } catch { return new Response("Bad JSON", { status: 400 }); }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        for (const entry of body.entry ?? []) {
          for (const change of entry.changes ?? []) {
            const value = change.value;
            if (!value?.messages?.length) continue;
            const contactName = value.contacts?.[0]?.profile?.name ?? null;

            for (const msg of value.messages) {
              const from = msg.from;
              const text =
                msg.text?.body ??
                msg.button?.text ??
                msg.interactive?.button_reply?.title ??
                msg.interactive?.list_reply?.title ??
                "";

              // Upsert conversation
              const { data: existing } = await supabaseAdmin
                .from("whatsapp_conversations")
                .select("*")
                .eq("mobile", from)
                .maybeSingle();

              let convId: string;
              let aiContext: Record<string, unknown> = {};
              let handoffRequested = false;
              let status = "ai";
              let leadId: string | null = null;

              if (existing) {
                convId = existing.id as string;
                aiContext = (existing.ai_context as Record<string, unknown>) ?? {};
                handoffRequested = existing.handoff_requested as boolean;
                status = existing.status as string;
                leadId = (existing.lead_id as string | null) ?? null;
              } else {
                const { data: created } = await supabaseAdmin
                  .from("whatsapp_conversations")
                  .insert({
                    mobile: from,
                    customer_name: contactName,
                    last_message_preview: text.slice(0, 120),
                  } as never)
                  .select("id")
                  .single();
                convId = (created as { id: string }).id;
              }

              // Insert inbound message
              await supabaseAdmin.from("whatsapp_messages").insert({
                conversation_id: convId,
                direction: "in",
                sender: "customer",
                body: text,
                wa_message_id: msg.id,
                meta: msg as unknown as Record<string, unknown>,
              } as never);

              // Manual handoff already? just notify admins, skip AI
              const wantsHuman = HANDOFF_KEYWORDS.some((k) => text.toLowerCase().includes(k));
              if (handoffRequested || status === "human") {
                await supabaseAdmin
                  .from("whatsapp_conversations")
                  .update({
                    last_message_at: new Date().toISOString(),
                    last_message_preview: text.slice(0, 120),
                  } as never)
                  .eq("id", convId);
                continue;
              }

              // Build history for AI
              const { data: recent } = await supabaseAdmin
                .from("whatsapp_messages")
                .select("direction,sender,body")
                .eq("conversation_id", convId)
                .order("created_at", { ascending: false })
                .limit(20);

              const history = ((recent ?? []) as Array<{ direction: string; sender: string; body: string | null }>)
                .reverse()
                .map((m) => ({
                  role: m.direction === "in" ? "user" as const : "assistant" as const,
                  content: m.body ?? "",
                }));

              const summary = JSON.stringify({ ...aiContext, contactName });

              let ai: AiOut;
              try {
                ai = await generateReply(history, summary);
              } catch (e) {
                console.error("AI error", e);
                ai = { reply: "Namaste! Thoda technical issue aa gaya, ek sales advisor jaldi aapse baat karega 🙏", handoff: true };
              }

              const shouldHandoff = wantsHuman || ai.handoff === true;
              const merged = {
                ...aiContext,
                ...(ai.extracted ?? {}),
                stage: ai.stage ?? aiContext.stage,
              };

              // Ensure lead exists once we know something
              const extractedName = (ai.extracted?.name as string | null) ?? contactName;
              if (!leadId) {
                const { data: newLead } = await supabaseAdmin
                  .from("leads")
                  .insert({
                    customer_name: extractedName ?? "WhatsApp Lead",
                    mobile: from,
                    source: "whatsapp_ai",
                    status: "new",
                    notes: `Started via WhatsApp AI. First message: ${text.slice(0, 200)}`,
                  } as never)
                  .select("id")
                  .single();
                leadId = (newLead as { id: string } | null)?.id ?? null;
              } else if (ai.extracted) {
                const patch: Record<string, unknown> = {};
                if (ai.extracted.name && !aiContext.name) patch.customer_name = ai.extracted.name;
                if (ai.extracted.budget) patch.budget = ai.extracted.budget;
                if (ai.extracted.location) patch.location = ai.extracted.location;
                if (Object.keys(patch).length) {
                  await supabaseAdmin.from("leads").update(patch as never).eq("id", leadId);
                }
              }

              // Send reply
              const replyText = ai.reply?.trim() || "Ji, batayein 🙂";
              const send = await sendWhatsAppText(from, replyText);

              await supabaseAdmin.from("whatsapp_messages").insert({
                conversation_id: convId,
                direction: "out",
                sender: shouldHandoff ? "system" : "ai",
                body: replyText,
                meta: { send_ok: send.ok } as Record<string, unknown>,
              } as never);

              await supabaseAdmin
                .from("whatsapp_conversations")
                .update({
                  customer_name: extractedName ?? contactName,
                  lead_id: leadId,
                  ai_context: merged as never,
                  handoff_requested: shouldHandoff,
                  status: shouldHandoff ? "human" : "ai",
                  last_message_at: new Date().toISOString(),
                  last_message_preview: replyText.slice(0, 120),
                } as never)
                .eq("id", convId);

              // Notify admins on handoff
              if (shouldHandoff) {
                const { data: admins } = await supabaseAdmin
                  .from("user_roles")
                  .select("user_id")
                  .eq("role", "admin");
                const notifs = ((admins ?? []) as Array<{ user_id: string }>).map((a) => ({
                  user_id: a.user_id,
                  title: "WhatsApp handoff requested",
                  message: `${extractedName ?? from} chahte hain human se baat karna. Mobile: ${from}`,
                }));
                if (notifs.length) await supabaseAdmin.from("notifications").insert(notifs as never);
              }
            }
          }
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});