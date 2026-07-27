"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/input";
import { ErrorNote } from "@/components/ui/states";
import { api, type MfaEnrollment } from "@/lib/api";
import { useAuth, useRequireAuth } from "@/lib/auth";

export default function SettingsPage() {
  const user = useRequireAuth();
  const { signOut } = useAuth();
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) setName(user.name ?? "");
  }, [user]);

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await api.updateMe({ name });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  return (
    <AppShell title="Settings">
      <div className="mx-auto flex w-full max-w-[--layout-content-max] flex-col gap-6">
        <Card className="flex flex-col gap-4">
          <h2 className="text-h3 text-fg">Profile</h2>
          <form onSubmit={onSave} className="flex flex-col gap-4">
            <Field label="Email" value={user.email} readOnly />
            <Field
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="How should we greet you?"
            />
            {error && <ErrorNote message={error} />}
            {saved && (
              <p role="status" className="text-body-sm text-success-fg">
                Saved.
              </p>
            )}
            <div className="flex justify-end">
              <Button type="submit" size="md" disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </Card>

        <MfaCard initiallyEnabled={user.mfa_enabled} />

        <Card className="flex flex-col gap-3">
          <h2 className="text-h3 text-fg">Session</h2>
          <p className="measure text-body-sm text-fg-muted">
            Signing out revokes this session on the server — the token stops
            working immediately, not just on this device.
          </p>
          <div className="flex justify-start">
            <Button variant="secondary" size="md" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function MfaCard({ initiallyEnabled }: { initiallyEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onStart() {
    setError(null);
    setBusy(true);
    try {
      setEnrollment(await api.enableMfa());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start enrollment.");
    } finally {
      setBusy(false);
    }
  }

  async function onConfirm(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.verifyMfa(code);
      setEnabled(true);
      setEnrollment(null);
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Incorrect code.");
    } finally {
      setBusy(false);
    }
  }

  async function onDisable() {
    setError(null);
    setBusy(true);
    try {
      await api.disableMfa();
      setEnabled(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disable MFA.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-h3 text-fg">Two-factor authentication</h2>

      {enrollment ? (
        <div className="flex flex-col gap-4">
          <p className="measure text-body-sm text-fg-muted">
            Add this to your authenticator app, then enter the 6-digit code it
            shows to finish enabling.
          </p>
          <div className="flex flex-col gap-1 rounded-md border border-border bg-surface p-3">
            <span className="text-caption text-fg-subtle">Setup key</span>
            <code className="break-all text-body-sm text-fg">{enrollment.secret}</code>
          </div>
          <details className="text-body-sm text-fg-muted">
            <summary className="cursor-pointer text-fg">
              Can&apos;t scan a QR code? Use this link
            </summary>
            <code className="mt-2 block break-all text-caption">{enrollment.otpauth_uri}</code>
          </details>
          <div className="flex flex-col gap-1 rounded-md border border-warning bg-surface p-3">
            <span className="text-caption text-fg-subtle">
              Backup codes — save these now, shown only once
            </span>
            <div className="grid grid-cols-2 gap-1 font-mono text-body-sm text-fg">
              {enrollment.backup_codes.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>
          </div>
          <form onSubmit={onConfirm} className="flex flex-col gap-4">
            <Field
              label="Code from your authenticator app"
              name="code"
              required
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            {error && <ErrorNote message={error} />}
            <div className="flex gap-3">
              <Button type="submit" size="md" disabled={busy}>
                {busy ? "Confirming…" : "Confirm and enable"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => {
                  setEnrollment(null);
                  setError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      ) : enabled ? (
        <div className="flex flex-col gap-3">
          <p className="measure text-body-sm text-fg-muted">
            Enabled. Sign-in now asks for a code from your authenticator app.
          </p>
          {error && <ErrorNote message={error} />}
          <div className="flex justify-start">
            <Button variant="secondary" size="md" onClick={onDisable} disabled={busy}>
              {busy ? "Disabling…" : "Disable"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="measure text-body-sm text-fg-muted">
            Not enabled. Add an authenticator app as a second sign-in step.
          </p>
          {error && <ErrorNote message={error} />}
          <div className="flex justify-start">
            <Button size="md" onClick={onStart} disabled={busy}>
              {busy ? "Starting…" : "Enable two-factor authentication"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
