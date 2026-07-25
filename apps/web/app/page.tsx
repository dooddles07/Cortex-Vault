import Link from "next/link";
import { Glyph, Wordmark } from "@/components/brand/glyph";

const FEATURES = [
  {
    title: "Every claim is traceable",
    body: "Click any citation and land on the exact chunk, page and line it came from. No ungrounded generation, ever.",
  },
  {
    title: "Ingests what others won't",
    body: "PDFs with OCR, YouTube transcripts, web clips, code snippets and meeting notes — one searchable corpus.",
  },
  {
    title: "Hybrid retrieval",
    body: "Keyword and vector search run together and re-rank, so exact terminology and fuzzy recall both work.",
  },
  {
    title: "Yours to leave with",
    body: "Full export at every tier, self-host the whole stack, or point it at a local Ollama model.",
  },
] as const;

type Tier = {
  name: string;
  price: string;
  per: string;
  blurb: string;
  feats: readonly string[];
  featured?: boolean;
};

const TIERS: readonly Tier[] = [
  {
    name: "Free",
    price: "$0",
    per: "forever",
    blurb: "For a single vault you want to keep.",
    feats: ["200 MB · 1,000 chunks", "50 AI messages / month", "BYO API key = unlimited AI", "Full export"],
  },
  {
    name: "Pro",
    price: "$12",
    per: "/month",
    blurb: "For daily research and recall.",
    feats: ["20 GB · unlimited docs", "1,500 messages included", "Priority embedding queue", "Version history"],
    featured: true,
  },
  {
    name: "Team",
    price: "$20",
    per: "/user/mo",
    blurb: "Shared memory for small teams.",
    feats: ["100 GB pooled", "Pooled AI budget", "Shared workspaces + roles", "Audit log"],
  },
  {
    name: "Enterprise",
    price: "Custom",
    per: "",
    blurb: "Compliance, scale and residency.",
    feats: ["SSO / SAML", "On-prem or VPC", "BYO-LLM required at scale", "DPA + SLA"],
  },
] as const;

export default function LandingPage() {
  // Marketing runs dark-primary; the app shell runs light by default.
  return (
    <div data-theme="dark" className="min-h-dvh bg-bg text-fg">
      <header className="mx-auto flex h-18 max-w-[--layout-content-max] items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Glyph size={32} />
          <Wordmark className="text-[1.25rem]" />
        </Link>
        <nav className="flex items-center gap-6" aria-label="Main">
          <Link href="/sign-in" className="text-body-sm text-fg-muted hover:text-fg">
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-label text-fg-on-primary hover:bg-primary-hover"
          >
            Start free
          </Link>
        </nav>
      </header>

      <main id="main">
        <section className="mx-auto flex max-w-[--layout-content-max] flex-col items-center gap-6 px-6 py-20 text-center">
          <span className="rounded-full bg-tint-accent px-4 py-1.5 text-caption text-on-tint-accent">
            Grounded RAG · self-hostable · your data stays yours
          </span>
          <h1 className="max-w-[900px] text-display-1 text-fg">
            Your second brain, with receipts.
          </h1>
          <p className="max-w-[720px] text-body-lg text-fg-muted">
            Capture documents, notes, PDFs, bookmarks and transcripts into one
            private vault — then ask it anything. Every answer cites the exact
            source chunk it came from. Nothing is invented.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex h-12 items-center rounded-md bg-primary px-5 text-body text-fg-on-primary hover:bg-primary-hover"
            >
              Start free — 200 MB
            </Link>
            <Link
              href="/chat"
              className="inline-flex h-12 items-center rounded-md border border-border-interactive bg-surface px-5 text-body text-fg hover:bg-bg-subtle"
            >
              See a cited answer
            </Link>
          </div>
          <p className="text-caption text-fg-subtle">
            No credit card · Export everything at any time · Bring your own LLM key
          </p>

          <div className="mt-6 w-full max-w-[1120px] overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-e4">
            {/* Gradient is a graphic token: a hairline, never a text background */}
            <div className="h-[3px] w-full gradient-brand" />
            <div className="flex flex-col gap-4 p-8">
              <p className="text-h3 text-fg-subtle">
                What did we decide about pgvector, and why?
              </p>
              <p className="text-body-lg text-fg">
                You chose pgvector for the MVP because it needs no extra
                infrastructure and stays free-tier friendly. The accepted tradeoff
                is a lower recall and latency ceiling than Pinecone or Qdrant at
                very large scale.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-overline text-fg-subtle">Sources</span>
                {["ARCHITECTURE.md p.6", "Interview — Maya", "pgvector-vs-qdrant"].map(
                  (s) => (
                    <span
                      key={s}
                      className="rounded-xs bg-tint-accent px-2 py-1 text-citation text-on-tint-accent"
                    >
                      {s}
                    </span>
                  ),
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto flex max-w-[--layout-content-max] flex-col items-center gap-12 px-6 py-20">
          <h2 className="max-w-[900px] text-center text-display-2 text-fg">
            Not a chatbot bolted onto notes
          </h2>
          <div className="grid w-full max-w-[1120px] gap-6 md:grid-cols-2">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-6"
              >
                <h3 className="text-h3 text-fg">{f.title}</h3>
                <p className="text-body text-fg-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-bg-subtle px-6 py-20">
          <div className="mx-auto flex max-w-[--layout-content-max] flex-col items-center gap-12">
            <h2 className="max-w-[1000px] text-center text-display-2 text-fg">
              Start free. Bring your own key and stay free.
            </h2>
            <div className="grid w-full max-w-[1200px] gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {TIERS.map((t) => (
                <div
                  key={t.name}
                  className={`flex flex-col gap-3 rounded-xl bg-surface p-6 ${
                    t.featured ? "border-2 border-primary" : "border border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-h4 text-fg">{t.name}</h3>
                    {t.featured && (
                      <span className="rounded-full bg-tint-brand px-2 py-0.5 text-caption text-on-tint-brand">
                        Popular
                      </span>
                    )}
                  </div>
                  <p className="flex items-baseline gap-1">
                    <span className="tabular text-h1 text-fg">{t.price}</span>
                    {t.per && <span className="text-caption text-fg-subtle">{t.per}</span>}
                  </p>
                  <p className="text-body-sm text-fg-muted">{t.blurb}</p>
                  <ul className="flex flex-col gap-1">
                    {t.feats.map((f) => (
                      <li key={f} className="text-body-sm text-fg-muted">
                        · {f}
                      </li>
                    ))}
                  </ul>
                  <div className="flex-1" />
                  <Link
                    href="/dashboard"
                    className={`inline-flex h-10 items-center justify-center rounded-md px-4 text-label ${
                      t.featured
                        ? "bg-primary text-fg-on-primary hover:bg-primary-hover"
                        : "border border-border-interactive bg-surface text-fg hover:bg-bg-subtle"
                    }`}
                  >
                    {t.name === "Enterprise" ? "Contact sales" : `Choose ${t.name}`}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
