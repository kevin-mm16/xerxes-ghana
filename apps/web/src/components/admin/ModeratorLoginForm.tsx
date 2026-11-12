"use client";

import AppLink from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Alert, Badge, Button, Field, Icon, Input } from "@/components/ui";
import { loginReviewer } from "@/services/moderation";

export function ModeratorLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const feedback = useRef<HTMLDivElement>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await loginReviewer(username, password);
      setPassword("");
      router.replace("/moderator/dashboard");
    } catch (reason) {
      setPassword("");
      setError(
        reason instanceof Error
          ? reason.message
          : "Sign-in could not be completed.",
      );
      requestAnimationFrame(() => feedback.current?.focus());
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="min-h-screen bg-[#172021] px-5 py-7 text-[#f5f3ed] sm:px-8 sm:py-10">
      <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-5">
        <AppLink
          href="/"
          className="text-[17px] font-semibold tracking-[0.12em]"
        >
          XERSXES{" "}
          <span className="ml-2 text-[10px] font-normal tracking-[0.1em] text-[#a6b1a8]">
            / GHANA
          </span>
        </AppLink>
        <AppLink
          href="/map"
          className="flex min-h-10 items-center gap-2 text-xs text-[#c4cdc5]"
        >
          <Icon name="arrow-left" className="h-4 w-4" />
          Public workspace
        </AppLink>
      </header>
      <div className="mx-auto grid max-w-5xl gap-12 py-16 sm:py-24 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-20">
        <section>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#a6b1a8]">
            XERSXES Operations
          </p>
          <h1 className="mt-5 max-w-md text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            A workspace for evidence review.
          </h1>
          <p className="mt-6 max-w-md text-sm leading-7 text-[#aebbb0]">
            Authorized reviewers can inspect private submissions, establish
            reviewed activity locations and prepare safe public records.
          </p>
          <div className="mt-8 flex items-start gap-3 border-t border-white/10 pt-6">
            <Icon
              name="shield"
              className="mt-0.5 h-4 w-4 shrink-0 text-[#a6b1a8]"
            />
            <p className="max-w-sm text-xs leading-6 text-[#aebbb0]">
              Private evidence requires deliberate source protection. Metadata
              stripping does not remove identifying faces, voices or landmarks.
            </p>
          </div>
        </section>
        <section
          aria-labelledby="reviewer-sign-in"
          className="rounded-[6px] border border-line bg-paper p-6 text-ink sm:p-8"
        >
          <Badge tone="neutral">Restricted access</Badge>
          <h2
            id="reviewer-sign-in"
            className="mt-5 text-xl font-semibold tracking-tight"
          >
            Reviewer sign-in
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Use your assigned reviewer account. Sessions expire after eight
            hours.
          </p>
          <form onSubmit={submit} className="mt-6 space-y-5">
            <Field label="Username" required>
              <Input
                autoComplete="username"
                value={username}
                required
                maxLength={120}
                disabled={busy}
                onChange={(event) => setUsername(event.target.value)}
              />
            </Field>
            <Field label="Password" required>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                required
                maxLength={1024}
                disabled={busy}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            {error && (
              <div ref={feedback} tabIndex={-1}>
                <Alert tone="red" title="Sign-in failed">
                  {error}
                </Alert>
              </div>
            )}
            <Button
              type="submit"
              disabled={busy}
              className="w-full justify-between"
            >
              {busy ? "Signing in…" : "Sign in"}
              <Icon name="arrow-right" className="h-4 w-4" />
            </Button>
          </form>
          <p className="mt-5 text-[11px] leading-5 text-muted">
            Public contribution does not require an account. Reviewer
            credentials must never be included in submitted evidence.
          </p>
        </section>
      </div>
    </main>
  );
}
