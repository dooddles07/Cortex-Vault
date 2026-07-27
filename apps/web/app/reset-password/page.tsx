"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Glyph, Wordmark } from "@/components/brand/glyph";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { ErrorNote } from "@/components/ui/states";
import { api } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    setError(null);
    setBusy(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That link is invalid or has expired.");
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return <ErrorNote message="This reset link is missing its token. Request a new one." />;
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="text-body text-fg">
          Password updated. Every other session was signed out — sign in again with your new
          password.
        </p>
        <Button size="lg" className="w-full" onClick={() => router.push("/sign-in")}>
          Go to sign in
        </Button>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <Field
        label="New password"
        type="password"
        name="password"
        size="lg"
        required
        minLength={8}
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <ErrorNote message={error} />}
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="grid min-h-dvh place-items-center px-6 py-16">
      <div className="flex w-full max-w-[400px] flex-col gap-5">
        <Link href="/" className="flex items-center gap-2">
          <Glyph size={32} />
          <Wordmark className="text-[1.25rem]" />
        </Link>

        <h1 className="text-h1 text-fg">Choose a new password</h1>

        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
