"use client";

import { Check, Copy, KeyRound, LogOut, Palette, ShieldCheck, User } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Field } from "@/components/ui/input";
import { ErrorNote } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { api, type MfaEnrollment } from "@/lib/api";
import { useAuth, useRequireAuth } from "@/lib/auth";

const SECTIONS = [
  { id: "profile", label: "Profile", glyph: User },
  { id: "appearance", label: "Appearance", glyph: Palette },
  { id: "security", label: "Security", glyph: ShieldCheck },
  { id: "session", label: "Session", glyph: LogOut },
] as const;

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
      <div className="mx-auto grid w-full max-w-(--layout-content-max) gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
        {/* In-page nav, not routes - these are all one screen. */}
        <nav aria-label="Settings sections" className="hidden lg:block">
          <ul className="sticky top-24 flex flex-col gap-1">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="flex min-h-11 items-center gap-3 rounded-md px-3 text-label text-fg-muted transition-colors duration-(--duration-fast) hover:bg-bg-subtle hover:text-fg"
                >
                  <Icon of={section.glyph} size={16} />
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex min-w-0 flex-col gap-6">
          <Card id="profile" className="flex scroll-mt-24 flex-col gap-4">
            <h2 className="text-h3 text-fg">Profile</h2>
            <form onSubmit={onSave} className="flex flex-col gap-4">
              <Field
                label="Email"
                value={user.email}
                readOnly
                helper={
                  user.email_verified
                    ? "Verified."
                    : "Not verified — chat and uploads stay locked until you confirm it."
                }
              />
              <Field
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="How should we greet you?"
              />
              {error && <ErrorNote message={error} />}
              {saved && (
                <p role="status" className="flex items-center gap-1.5 text-body-sm text-success">
                  <Icon of={Check} size={16} />
                  Saved.
                </p>
              )}
              <div className="flex justify-end">
                <Button type="submit" size="md" loading={busy}>
                  Save changes
                </Button>
              </div>
            </form>
          </Card>

          <Card id="appearance" className="flex scroll-mt-24 flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-h3 text-fg">Appearance</h2>
              <p className="measure text-body-sm text-fg-muted">
                Dark is the default — the vault is built for long reading
                sessions. System follows your operating system.
              </p>
            </div>
            <ThemeToggle className="w-full sm:w-fit" />
          </Card>

          <MfaCard initiallyEnabled={user.mfa_enabled} />

          <Card id="session" className="flex scroll-mt-24 flex-col gap-3">
            <h2 className="text-h3 text-fg">Session</h2>
            <p className="measure text-body-sm text-fg-muted">
              Signing out revokes this session on the server — the token stops
              working immediately, not just on this device.
            </p>
            <div className="flex justify-start">
              <Button variant="secondary" size="md" onClick={signOut}>
                <Icon of={LogOut} size={16} />
                Sign out
              </Button>
            </div>
          </Card>
        </div>
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
  const toast = useToast();

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
      toast("Two-factor authentication is on.", "success");
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
      toast("Two-factor authentication is off.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disable MFA.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card id="security" className="flex scroll-mt-24 flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-h3 text-fg">Two-factor authentication</h2>
        <span
          className={`inline-flex h-[22px] shrink-0 items-center gap-1 rounded-full px-2 text-caption font-medium ${
            enabled
              ? "bg-tint-success text-on-tint-success"
              : "bg-tint-neutral text-on-tint-neutral"
          }`}
        >
          <span aria-hidden className="size-1.5 rounded-full bg-current" />
          {enabled ? "On" : "Off"}
        </span>
      </div>

      {enrollment ? (
        <div className="flex flex-col gap-4">
          <p className="measure text-body-sm text-fg-muted">
            Add this to your authenticator app, then enter the 6-digit code it
            shows to finish enabling.
          </p>

          <CopyBlock label="Setup key" value={enrollment.secret} />

          <details className="text-body-sm text-fg-muted">
            <summary className="min-h-11 cursor-pointer content-center text-fg">
              Can&apos;t scan a QR code? Use this link
            </summary>
            <code className="mt-2 block break-all text-caption">
              {enrollment.otpauth_uri}
            </code>
          </details>

          <div className="flex flex-col gap-2 rounded-md border border-warning bg-surface p-3">
            <span className="flex items-center gap-2 text-caption text-on-tint-warning">
              <Icon of={KeyRound} size={14} />
              Backup codes — save these now, shown only once
            </span>
            <div className="grid grid-cols-2 gap-1 text-code text-fg">
              {enrollment.backup_codes.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>
            <CopyButton
              value={enrollment.backup_codes.join("\n")}
              label="Copy all codes"
            />
          </div>

          <form onSubmit={onConfirm} className="flex flex-col gap-4">
            <Field
              label="Code from your authenticator app"
              name="code"
              required
              autoComplete="one-time-code"
              inputMode="numeric"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            {error && <ErrorNote message={error} />}
            <div className="flex gap-3">
              <Button type="submit" size="md" loading={busy}>
                Confirm and enable
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
            Sign-in asks for a code from your authenticator app.
          </p>
          {error && <ErrorNote message={error} />}
          <div className="flex justify-start">
            <Button variant="secondary" size="md" onClick={onDisable} loading={busy}>
              Disable
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="measure text-body-sm text-fg-muted">
            Add an authenticator app as a second sign-in step.
          </p>
          {error && <ErrorNote message={error} />}
          <div className="flex justify-start">
            <Button size="md" onClick={onStart} loading={busy}>
              Enable two-factor authentication
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function CopyBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-bg-subtle p-3">
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-caption text-fg-subtle">{label}</span>
        <code className="break-all text-code text-fg">{value}</code>
      </span>
      <CopyButton value={value} label={`Copy ${label.toLowerCase()}`} iconOnly />
    </div>
  );
}

function CopyButton({
  value,
  label,
  iconOnly = false,
}: {
  value: string;
  label: string;
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={label}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-md text-caption transition-colors duration-(--duration-fast) ${
        iconOnly ? "size-11 shrink-0 justify-center" : "self-start px-1"
      } ${copied ? "text-success" : "text-fg-subtle hover:text-fg"}`}
    >
      <Icon of={copied ? Check : Copy} size={16} />
      {!iconOnly && (copied ? "Copied" : label)}
    </button>
  );
}
