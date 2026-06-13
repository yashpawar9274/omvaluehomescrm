import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, MapPin, Phone, IndianRupee, Home, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import buildingAsset from "@/assets/om-value-homes.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Om Value Homes — 1, 2 & 3 BHK in Palghar West" },
      { name: "description", content: "Luxury 1, 2 & 3 BHK apartments starting ₹19.90 Lacs* at Palghar (W). PMAY benefits, premium amenities. MahaRERA P99000055618." },
      { property: "og:title", content: "Om Value Homes" },
      { property: "og:description", content: "Apna ghar ab sapna nahi, haqeeqat hai. 1, 2 & 3 BHK Luxury Apartments in Palghar West." },
    ],
  }),
  component: Splash,
});

const SLIDES = [
  {
    eyebrow: "OM VALUE HOMES",
    title: "Apna Ghar — Ab Sapna Nahi, Haqeeqat Hai",
    desc: "1, 2 & 3 BHK Luxury Apartments in the heart of Palghar West. Apke sapno ka ghar, aapke budget mein.",
    icon: Home,
    badge: "Palghar (W)",
  },
  {
    eyebrow: "STARTING @ ₹19.90 LACS*",
    title: "Dream Home at Dream Price",
    desc: "PMAY subsidy benefits • Home loan available • Premium amenities — CCTV, Elevator, 24×7 water, parking & fire safety.",
    icon: IndianRupee,
    badge: "PMAY Benefits",
  },
  {
    eyebrow: "LIMITED FLATS — BOOK NOW",
    title: "Ab Der Mat Karo, Ghar Aapka Intezaar Kar Raha Hai",
    desc: "Dhansaar, Old Satpati Road, Palghar West. MahaRERA: P99000055618. Site visit book karein aaj hi.",
    icon: Sparkles,
    badge: "+91 8828300415",
  },
];

function Splash() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) navigate({ to: "/dashboard" });
      else setChecking(false);
    });
    return () => { active = false; };
  }, [navigate]);

  if (checking) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-background">
        <div className="h-10 w-10 animate-pulse rounded-2xl bg-primary/30" />
      </div>
    );
  }

  const isLast = step === SLIDES.length - 1;
  const slide = SLIDES[step];
  const Icon = slide.icon;

  const next = () => {
    if (isLast) navigate({ to: "/auth" });
    else setStep((s) => s + 1);
  };

  return (
    <div
      className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col bg-background text-foreground"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Hero image */}
      <div className="relative h-[58dvh] w-full overflow-hidden">
        <img
          src={buildingAsset.url}
          alt="Om Value Homes — Palghar West"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-background" />
        <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-background/85 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground shadow-sm backdrop-blur">
          <MapPin className="h-3.5 w-3.5 text-primary" /> {slide.badge}
        </div>
        <button
          onClick={() => navigate({ to: "/auth" })}
          className="absolute right-4 top-4 rounded-full bg-background/85 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground shadow-sm backdrop-blur"
        >
          Skip
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col px-6 pt-6">
        <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-accent-foreground">
          <Icon className="h-3.5 w-3.5" /> {slide.eyebrow}
        </div>
        <h1 className="text-balance text-[26px] font-bold leading-tight tracking-tight">
          {slide.title}
        </h1>
        <p className="mt-3 text-pretty text-[15px] leading-relaxed text-muted-foreground">
          {slide.desc}
        </p>

        <div className="mt-auto pb-6 pt-8">
          {/* dots */}
          <div className="mb-5 flex items-center justify-center gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === step ? "w-8 bg-primary" : "w-1.5 bg-border"}`}
              />
            ))}
          </div>

          <Button onClick={next} size="lg" className="h-12 w-full text-base font-semibold">
            {isLast ? "Get Started" : "Next"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          {isLast && (
            <a
              href="tel:+918828300415"
              className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-card text-sm font-medium text-foreground"
            >
              <Phone className="h-4 w-4 text-primary" /> Call 8828300415
            </a>
          )}

          <p className="mt-4 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
            MahaRERA: P99000055618
          </p>
        </div>
      </div>
    </div>
  );
}
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
