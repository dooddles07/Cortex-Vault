import Link from "next/link";
import {
  ArrowRight,
  Check,
  FileSearch,
  Inbox,
  Layers,
  Quote,
  ScanText,
  ServerCog,
  ShieldCheck,
  Split,
} from "lucide-react";
import { Glyph, Wordmark } from "@/components/brand/glyph";
import { GroundedAnswer } from "@/components/marketing/grounded-answer";
import { Reveal } from "@/components/marketing/reveal";
import { Icon } from "@/components/ui/icon";

/** A real pipeline, so the steps are numbered. Nothing else on this page is. */
const PIPELINE = [
  {
    glyph: Inbox,
    title: "Capture",
    body: "Drop in PDFs, Word and slide decks, Markdown, web clips, images and meeting notes. One vault, one format-agnostic inbox.",
  },
  {
    glyph: ScanText,
    title: "Ingest",
    body: "Text is extracted, scans go through OCR, and everything is split on token boundaries — so a chunk never ends mid-thought.",
  },
  {
    glyph: Split,
    title: "Retrieve",
    body: "Keyword and vector search run side by side, then a model re-ranks the merged set. Exact terminology and fuzzy recall both land.",
  },
  {
    glyph: Quote,
    title: "Cite",
    body: "The answer is written only from the retrieved chunks, and each claim carries the chunk it came from. Nothing else gets said.",
  },
] as const;

const DIFFERENTIATORS = [
  {
    glyph: FileSearch,
    title: "Every claim is traceable",
    body: "Open any citation and land on the chunk it came from, with its document, page and position. There is no ungrounded sentence to find.",
  },
  {
    glyph: Layers,
    title: "Ingests what others won't",
    body: "Scanned PDFs through OCR, Office files, transcripts, web clips and code — all searchable in the same corpus, not siloed by type.",
  },
  {
    glyph: ServerCog,
    title: "Runs on your terms",
    body: "Self-host the whole stack, bring your own LLM key, or point the embedder at a local Ollama model. Nothing forces a round trip.",
  },
  {
    glyph: ShieldCheck,
    title: "Yours to leave with",
    body: "Full export at every tier, including the free one. Your corpus is not the lock-in, and we would rather you could prove that.",
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

/** Stated plainly, because a product about grounding cannot oversell itself. */
const LIMITS = [
  {
    q: "Will it answer from general knowledge?",
    a: "No. If the retrieval step comes back empty, the answer says so instead of filling the gap. That is the whole point of the product.",
  },
  {
    q: "What happens when OCR fails on a scan?",
    a: "The document is still stored and still findable by filename and metadata. The failed stage is shown on the row with a retry, not hidden.",
  },
  {
    q: "Is the free tier a trial?",
    a: "No. It stays free, and bringing your own LLM key removes the message cap entirely. Storage is the only real limit.",
  },
  {
    q: "Where does my data live?",
    a: "Postgres with pgvector, plus optional object storage. Self-host it and the answer is: wherever you put it.",
  },
] as const;

export default function LandingPage() {
  // Marketing runs dark. The app shell has its own theme control.
  return (
    <div data-theme="dark" className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-(--z-header) border-b border-border/60 bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-(--layout-content-max) items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <Glyph size={30} />
            <Wordmark className="text-[1.25rem]" />
          </Link>
          <nav className="flex items-center gap-2 sm:gap-5" aria-label="Main">
            <Link
              href="#pricing"
              className="hidden min-h-11 items-center px-2 text-body-sm text-fg-muted transition-colors duration-(--duration-fast) hover:text-fg sm:inline-flex"
            >
              Pricing
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex min-h-11 items-center px-2 text-body-sm text-fg-muted transition-colors duration-(--duration-fast) hover:text-fg"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex h-11 items-center rounded-md bg-primary px-4 text-label text-fg-on-primary transition-colors duration-(--duration-fast) hover:bg-primary-hover"
            >
              Start free
            </Link>
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="relative overflow-hidden px-6 py-16 sm:py-24">
          {/* Decorative aura only - permitted use of the gradient, no text on it */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full opacity-[0.14] blur-3xl gradient-brand"
          />

          <div className="relative mx-auto flex max-w-(--layout-content-max) flex-col items-center gap-6 text-center">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full bg-tint-accent px-4 py-1.5 text-caption text-on-tint-accent">
                Grounded RAG · self-hostable · your data stays yours
              </span>
            </Reveal>

            <Reveal delay={1}>
              <h1 className="max-w-[900px] text-display-1 text-fg">
                Your second brain, with receipts.
              </h1>
            </Reveal>

            <Reveal delay={2}>
              <p className="measure mx-auto text-body-lg text-fg-muted">
                Capture documents, notes, PDFs, bookmarks and transcripts into one
                private vault, then ask it anything. Every answer cites the exact
                source chunk it came from. Nothing is invented.
              </p>
            </Reveal>

            <Reveal delay={3}>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/sign-up"
                  className="inline-flex h-12 items-center gap-2 rounded-md bg-primary px-5 text-body text-fg-on-primary transition-colors duration-(--duration-fast) hover:bg-primary-hover"
                >
                  Start free — 200 MB
                  <Icon of={ArrowRight} size={18} />
                </Link>
                <Link
                  href="/chat"
                  className="inline-flex h-12 items-center rounded-md border border-border-interactive bg-surface px-5 text-body text-fg transition-colors duration-(--duration-fast) hover:bg-bg-subtle"
                >
                  See a cited answer
                </Link>
              </div>
            </Reveal>

            <Reveal delay={4}>
              <p className="text-caption text-fg-subtle">
                No credit card · Export everything at any time · Bring your own LLM key
              </p>
            </Reveal>

            <Reveal delay={5} className="mt-6 flex w-full justify-center">
              <GroundedAnswer />
            </Reveal>
          </div>
        </section>

        <section className="border-t border-border px-6 py-20">
          <div className="mx-auto flex max-w-(--layout-content-max) flex-col gap-12">
            <Reveal className="flex flex-col gap-3">
              <span className="text-overline text-fg-subtle">How an answer is made</span>
              <h2 className="max-w-[720px] text-display-2 text-fg">
                Four steps, and you can audit every one
              </h2>
            </Reveal>

            <ol className="grid gap-x-6 gap-y-10 md:grid-cols-2 xl:grid-cols-4">
              {PIPELINE.map((step, i) => (
                <Reveal key={step.title} delay={i} className="h-full">
                  <li className="flex h-full flex-col gap-3 border-t border-border pt-5">
                    <div className="flex items-center gap-3">
                      <span className="tabular text-citation text-accent-fg">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <Icon of={step.glyph} className="text-icon" />
                    </div>
                    <h3 className="text-h3 text-fg">{step.title}</h3>
                    <p className="text-body-sm text-fg-muted">{step.body}</p>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-border bg-bg-subtle px-6 py-20">
          <div className="mx-auto flex max-w-(--layout-content-max) flex-col gap-12">
            <Reveal>
              <h2 className="max-w-[820px] text-display-2 text-fg">
                Not a chatbot bolted onto notes
              </h2>
            </Reveal>

            <div className="grid gap-5 md:grid-cols-2">
              {DIFFERENTIATORS.map((item, i) => (
                <Reveal key={item.title} delay={i} className="h-full">
                  <div className="flex h-full flex-col gap-3 rounded-xl border border-border bg-surface p-6">
                    <span className="grid size-10 place-items-center rounded-md bg-tint-brand text-on-tint-brand">
                      <Icon of={item.glyph} />
                    </span>
                    <h3 className="text-h3 text-fg">{item.title}</h3>
                    <p className="text-body text-fg-muted">{item.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="border-t border-border px-6 py-20">
          <div className="mx-auto flex max-w-(--layout-content-max) flex-col gap-12">
            <Reveal className="flex flex-col gap-3">
              <span className="text-overline text-fg-subtle">Pricing</span>
              <h2 className="max-w-[900px] text-display-2 text-fg">
                Start free. Bring your own key and stay free.
              </h2>
            </Reveal>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {TIERS.map((tier, i) => (
                <Reveal key={tier.name} delay={i} className="h-full">
                  <div
                    className={`flex h-full flex-col gap-3 rounded-xl bg-surface p-6 ${
                      tier.featured
                        ? "border-2 border-primary shadow-e3"
                        : "border border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-h4 text-fg">{tier.name}</h3>
                      {tier.featured && (
                        <span className="rounded-full bg-tint-brand px-2 py-0.5 text-caption text-on-tint-brand">
                          Most chosen
                        </span>
                      )}
                    </div>

                    <p className="flex items-baseline gap-1">
                      <span className="tabular text-h1 text-fg">{tier.price}</span>
                      {tier.per && (
                        <span className="text-caption text-fg-subtle">{tier.per}</span>
                      )}
                    </p>

                    <p className="text-body-sm text-fg-muted">{tier.blurb}</p>

                    <ul className="flex flex-col gap-2 py-2">
                      {tier.feats.map((feat) => (
                        <li
                          key={feat}
                          className="flex items-start gap-2 text-body-sm text-fg-muted"
                        >
                          <Icon
                            of={Check}
                            size={16}
                            className="mt-0.5 text-accent-fg"
                          />
                          {feat}
                        </li>
                      ))}
                    </ul>

                    <div className="flex-1" />
                    <Link
                      href="/sign-up"
                      className={`inline-flex h-11 items-center justify-center rounded-md px-4 text-label transition-colors duration-(--duration-fast) ${
                        tier.featured
                          ? "bg-primary text-fg-on-primary hover:bg-primary-hover"
                          : "border border-border-interactive bg-surface text-fg hover:bg-bg-subtle"
                      }`}
                    >
                      {tier.name === "Enterprise" ? "Contact sales" : `Choose ${tier.name}`}
                    </Link>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-bg-subtle px-6 py-20">
          <div className="mx-auto grid max-w-(--layout-content-max) gap-10 lg:grid-cols-[minmax(0,360px)_1fr]">
            <Reveal className="flex flex-col gap-3">
              <span className="text-overline text-fg-subtle">Straight answers</span>
              <h2 className="text-h1 text-fg">What it will and will not do</h2>
              <p className="measure text-body-sm text-fg-muted">
                A product built on grounded answers should be able to give a few
                about itself.
              </p>
            </Reveal>

            <dl className="flex flex-col">
              {LIMITS.map((item, i) => (
                <Reveal key={item.q} delay={i}>
                  <div className="flex flex-col gap-2 border-t border-border py-5">
                    <dt className="text-h4 text-fg">{item.q}</dt>
                    <dd className="measure text-body-sm text-fg-muted">{item.a}</dd>
                  </div>
                </Reveal>
              ))}
            </dl>
          </div>
        </section>

        <section className="border-t border-border px-6 py-20">
          <Reveal className="mx-auto flex max-w-[720px] flex-col items-center gap-5 text-center">
            <h2 className="text-display-2 text-fg">Put your reading to work</h2>
            <p className="text-body-lg text-fg-muted">
              Add one document and ask it one question. That is the whole
              evaluation.
            </p>
            <Link
              href="/sign-up"
              className="inline-flex h-12 items-center gap-2 rounded-md bg-primary px-5 text-body text-fg-on-primary transition-colors duration-(--duration-fast) hover:bg-primary-hover"
            >
              Start free — 200 MB
              <Icon of={ArrowRight} size={18} />
            </Link>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-border px-6 py-10">
        <div className="mx-auto flex max-w-(--layout-content-max) flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <Link href="/" className="flex items-center gap-2">
              <Glyph size={24} />
              <Wordmark className="text-[1rem]" />
            </Link>
            <p className="text-caption text-fg-subtle">
              Your knowledge. Instantly recalled.
            </p>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-1">
            {[
              { href: "/sign-in", label: "Sign in" },
              { href: "/sign-up", label: "Create account" },
              { href: "#pricing", label: "Pricing" },
              { href: "/chat", label: "Try a cited answer" },
            ].map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="inline-flex min-h-11 items-center text-body-sm text-fg-muted transition-colors duration-(--duration-fast) hover:text-fg"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
