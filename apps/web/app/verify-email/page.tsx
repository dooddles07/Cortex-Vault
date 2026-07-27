"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { Icon } from "@/components/ui/icon";
import { ErrorNote, Spinner } from "@/components/ui/states";
import { api } from "@/lib/api";

type Status = "checking" | "verified" | "error";

function VerifyEmailBody() {
  const token = useSearchParams().get("token");
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("This link is missing its token.");
      return;
    }
    api
      .verifyEmail(token)
      .then(() => setStatus("verified"))
      .catch((err) => {
        setStatus("error");
        setError(
          err instanceof Error ? err.message : "That link is invalid or has expired.",
        );
      });
  }, [token]);

  if (status === "checking") return <Spinner label="Verifying your email…" />;

  if (status === "verified") {
    return (
      <div className="flex flex-col gap-4">
        <p
          role="status"
          className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4 text-body text-fg"
        >
          <Icon of={MailCheck} className="mt-0.5 text-success" />
          Your email is verified. Chat and uploads are unlocked.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary px-5 text-body text-fg-on-primary transition-colors duration-(--duration-fast) hover:bg-primary-hover"
        >
          Go to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ErrorNote message={error ?? "Verification failed."} />
      <Link
        href="/settings"
        className="inline-flex min-h-11 items-center text-body-sm text-primary-fg underline underline-offset-4"
      >
        Send a new link from Settings
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthLayout>
      <h1 className="text-h1 text-fg">Email verification</h1>
      <Suspense fallback={<Spinner label="Loading…" />}>
        <VerifyEmailBody />
      </Suspense>
    </AuthLayout>
  );
}
