import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Building2, ClipboardCheck, BellRing, BarChart3, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VisitFlow CRM — Real Estate Visit & Follow-Up Management" },
      { name: "description", content: "Centralized CRM for builders and developers to track site visits, follow-ups, and bookings — never miss a lead again." },
      { property: "og:title", content: "VisitFlow CRM" },
      { property: "og:description", content: "Track site visits, follow-ups & employee performance — built for real estate sales teams." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="h-4 w-4" />
            </div>
            VisitFlow
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost"><Link to="/auth">Sign in</Link></Button>
            <Button asChild><Link to="/auth">Get started</Link></Button>
          </div>
        </div>
      </header>

      <section
        className="relative overflow-hidden"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="mx-auto max-w-5xl px-6 py-24 text-center text-primary-foreground">
          <p className="mb-4 inline-block rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-widest">
            Real Estate CRM
          </p>
          <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Every site visit. Every follow-up. <span className="text-[color:var(--primary-glow)]">Zero misses.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-white/75 sm:text-lg">
            VisitFlow gives builders and sales teams a single command center for leads, visits, follow-ups and bookings — with live employee performance.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-[color:var(--primary-glow)] text-primary-foreground hover:opacity-95">
              <Link to="/auth">Start free <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/20 bg-white/5 text-primary-foreground hover:bg-white/10">
              <Link to="/auth">Live demo</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-12 text-center text-3xl font-semibold tracking-tight">Built for real estate sales workflows</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { i: ClipboardCheck, t: "Site visit tracking", d: "Log every visit with flat number, BHK preference, budget and interest level." },
            { i: BellRing, t: "Follow-up engine", d: "Never miss a callback — pending, completed, missed and overdue at a glance." },
            { i: Users, t: "Employee performance", d: "Per-employee visits, conversions and a live leaderboard." },
            { i: BarChart3, t: "Preference analytics", d: "See which BHK and budget ranges are trending in your market." },
            { i: Building2, t: "Booking pipeline", d: "Interested → Token → Confirmed → Registered, all visible." },
            { i: ArrowRight, t: "Full customer timeline", d: "Every call, visit and note stored in one place per lead." },
          ].map(({ i: Icon, t, d }) => (
            <div key={t} className="rounded-xl border border-border bg-card p-6 shadow-sm transition hover:shadow-[var(--shadow-elegant)]">
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-secondary/50">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-20 lg:grid-cols-3">
          {[
            { name: "Starter", price: "₹999", sub: "Up to 5 employees" },
            { name: "Professional", price: "₹2,999", sub: "Up to 25 employees", featured: true },
            { name: "Enterprise", price: "Custom", sub: "Unlimited employees" },
          ].map((p) => (
            <div key={p.name} className={`rounded-xl border p-8 ${p.featured ? "border-primary bg-card shadow-[var(--shadow-elegant)]" : "border-border bg-card"}`}>
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <p className="mt-3 text-4xl font-semibold tracking-tight">{p.price}<span className="text-base text-muted-foreground">/mo</span></p>
              <p className="mt-2 text-sm text-muted-foreground">{p.sub}</p>
              <Button asChild className="mt-6 w-full" variant={p.featured ? "default" : "outline"}>
                <Link to="/auth">Choose {p.name}</Link>
              </Button>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} VisitFlow CRM
      </footer>
    </div>
  );
}
