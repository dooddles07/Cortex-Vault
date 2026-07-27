"use client";

import Link from "next/link";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
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
    <AuthLayout>
      <h1 className="text-h1 text-fg">Reset your password</h1>
      <p className="text-body text-fg-muted">
        Enter the email on your account and we&apos;ll send a reset link.
      </p>

      {sent ? (
        <p
          role="status"
          className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4 text-body text-fg"
        >
          <Icon of={MailCheck} className="mt-0.5 text-success" />
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
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            Send reset link
          </Button>
        </form>
      )}

      <p className="text-center text-body-sm text-fg-subtle">
        <Link href="/sign-in" className="text-primary-fg underline underline-offset-4">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
