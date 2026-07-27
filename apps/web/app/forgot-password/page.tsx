"use client";

import Link from "next/link";
import { useState } from "react";
import { Glyph, Wordmark } from "@/components/brand/glyph";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { ErrorNote } from "@/components/ui/states";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // The API always returns the same message whether or not the email is
      // registered — this page must not imply otherwise.
      const { message } = await api.forgotPassword(email);
      setSent(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center px-6 py-16">
      <div className="flex w-full max-w-[400px] flex-col gap-5">
        <Link href="/" className="flex items-center gap-2">
          <Glyph size={32} />
          <Wordmark className="text-[1.25rem]" />
        </Link>

        <h1 className="text-h1 text-fg">Reset your password</h1>
        <p className="text-body text-fg-muted">
          Enter the email on your account and we&apos;ll send a reset link.
        </p>

        {sent ? (
          <p role="status" className="text-body text-fg">
            {sent}
          </p>
        ) : (
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
            {error && <ErrorNote message={error} />}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}

        <p className="text-center text-body-sm text-fg-subtle">
          <Link href="/sign-in" className="text-primary-fg underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
