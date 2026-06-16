import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aiAssistantChat } from "@/lib/ai-assistant.functions";

export const Route = createFileRoute("/_authenticated/ai-assistant")({ component: AiAssistant });

type Msg = { role: "user" | "assistant"; content: string };

function AiAssistant() {
  const qc = useQueryClient();
  const callAi = useServerFn(aiAssistantChat);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! I'm your CRM AI. Bolo — kya karna hai? (e.g. 'Show today ke visits', 'Add lead Rahul 9876543210', 'Update lead status to booking')" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await callAi({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: res.text || "(no reply)" }]);
      // Refresh data caches in case AI mutated something
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["visits"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Request failed";
      toast.error(msg);
      setMessages([...next, { role: "assistant", content: "Sorry — something went wrong. " + msg }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col">
      <PageHeader title="AI Assistant" subtitle="Bolo aur ho jaayega — leads, visits, follow-ups." />
      <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-border bg-card p-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-accent text-foreground"}`}>
              {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-accent"}`}>
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-accent"><Bot className="h-4 w-4" /></div>
            <div className="rounded-2xl bg-accent px-3 py-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /></div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          placeholder="Type your command…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          disabled={busy}
        />
        <Button onClick={send} disabled={busy || !input.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
        <Sparkles className="h-3 w-3" /> AI can add, update, delete leads & schedule follow-ups for you.
      </p>
    </div>
  );
}