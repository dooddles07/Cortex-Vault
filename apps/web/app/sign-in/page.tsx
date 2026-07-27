"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Glyph, Wordmark } from "@/components/brand/glyph";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { ErrorNote } from "@/components/ui/states";
import { useAuth } from "@/lib/auth";

export default function SignInPage() {
  const { signIn, user } = useAuth();
  const router = useRouter();
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
      await signIn(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
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

          <h1 className="text-h1 text-fg">Welcome back</h1>
          <p className="text-body text-fg-muted">Sign in to your vault.</p>

          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Link
              href="/forgot-password"
              className="self-end text-body-sm text-fg-subtle underline underline-offset-4"
            >
              Forgot password?
            </Link>
            {error && <ErrorNote message={error} />}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="text-center text-body-sm text-fg-subtle">
            New here?{" "}
            <Link href="/sign-up" className="text-primary-fg underline underline-offset-4">
              Create an account
            </Link>
          </p>
        </div>
      </main>

      <aside className="hidden flex-col justify-center gap-6 bg-surface-brand px-16 lg:flex">
        <span aria-hidden className="h-1 w-[120px] rounded-sm gradient-brand" />
        <p className="text-display-2 text-fg">
          Every answer cites the exact source chunk it came from.
        </p>
        <p className="measure text-body-lg text-fg-muted">
          CortexVault answers only from your own corpus. If it is not in your
          vault, it does not get said.
        </p>
      </aside>
    </div>
  );
}
