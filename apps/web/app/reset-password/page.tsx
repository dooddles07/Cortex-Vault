"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Suspense, useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Field } from "@/components/ui/input";
import { ErrorNote } from "@/components/ui/states";
import { api, setToken } from "@/lib/api";

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
      // The success message claims every other session was signed out; if
      // this browser happens to hold a token too, it must not be the one
      // exception left dangling.
      setToken(null);
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "That link is invalid or has expired.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <ErrorNote message="This reset link is missing its token. Request a new one." />
    );
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <p
          role="status"
          className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4 text-body text-fg"
        >
          <Icon of={ShieldCheck} className="mt-0.5 text-success" />
          Password updated. Every other session was signed out — sign in again
          with your new password.
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
        helper="At least 8 characters. Longer beats complex."
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <ErrorNote message={error} />}
      <Button type="submit" size="lg" className="w-full" loading={busy}>
        Update password
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <h1 className="text-h1 text-fg">Choose a new password</h1>
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
