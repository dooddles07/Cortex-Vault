"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Glyph, Wordmark } from "@/components/brand/glyph";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { ErrorNote } from "@/components/ui/states";
import { useAuth } from "@/lib/auth";

export default function SignUpPage() {
  const { signUp, user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signUp(email, password, name);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <main id="main" className="flex items-center justify-center px-6 py-16">
        <div className="flex w-full max-w-[400px] flex-col gap-5">
          <Link href="/" className="flex items-center gap-2">
            <Glyph size={32} />
            <Wordmark className="text-[1.25rem]" />
          </Link>

          <h1 className="text-h1 text-fg">Create your vault</h1>
          <p className="text-body text-fg-muted">
            Everything you capture stays yours.
          </p>

          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <Field
              label="Name"
              name="name"
              size="lg"
              autoComplete="name"
              placeholder="Optional"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Field
              label="Email"
              type="email"
              name="email"
              size="lg"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Field
              label="Password"
              type="password"
              name="password"
              size="lg"
              required
              minLength={8}
              autoComplete="new-password"
              helper="At least 8 characters. Longer beats complex."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <ErrorNote message={error} />}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? "Creating…" : "Create account"}
            </Button>
          </form>

          <p className="text-center text-body-sm text-fg-subtle">
            Already have a vault?{" "}
            <Link href="/sign-in" className="text-primary-fg underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
      </main>

      <aside className="hidden flex-col justify-center gap-6 bg-surface-brand px-16 lg:flex">
        <span aria-hidden className="h-1 w-[120px] rounded-sm gradient-brand" />
        <p className="text-display-2 text-fg">
          Capture everything. Ask it anything.
        </p>
        <p className="measure text-body-lg text-fg-muted">
          Notes, PDFs and bookmarks become one searchable memory — with a
          citation behind every claim.
        </p>
      </aside>
    </div>
  );
}
