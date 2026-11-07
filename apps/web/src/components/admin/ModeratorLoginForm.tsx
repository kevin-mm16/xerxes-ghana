"use client";

import { FormEvent, useState } from "react";
import AppLink from "next/link";
import { useRouter } from "next/navigation";

export function ModeratorLoginForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("Frontend access flow accepted for navigation. No authentication was performed.");
    window.setTimeout(() => router.push("/moderator/dashboard"), 500);
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <AppLink href="/" className="text-sm font-semibold text-emerald-200 hover:underline">
            Back to public site
          </AppLink>
          <p className="mt-10 text-xs font-bold uppercase tracking-[0.2em] text-amber-200">
            Authorized moderators only
          </p>
          <h1 className="mt-4 font-serif text-4xl font-medium leading-tight">Controlled review access</h1>
          <p className="mt-4 leading-7 text-slate-300">
            Production access should require strong authentication, MFA or passkeys,
            role-based authorization, audit logging, and a security review.
          </p>
        </div>

        <form onSubmit={submit} className="rounded-3xl border border-white/10 bg-white p-6 text-slate-950 shadow-lift sm:p-8">
          <h2 className="text-2xl font-bold">Moderator login</h2>
          <p className="mt-2 text-sm text-slate-600">Credentials are not sent because authentication is not connected yet.</p>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-bold">Email</span>
              <input
                type="email"
                placeholder="moderator@example.org"
                className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-forest-600"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold">Password</span>
              <input
                type="password"
                placeholder="Password"
                className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-forest-600"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold">MFA / passkey</span>
              <input
                placeholder="Future WebAuthn or authenticator challenge"
                className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-forest-600"
              />
            </label>
          </div>

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            Moderator access is private. Do not use shared devices or export sensitive review data.
          </div>

          {message ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            className="mt-6 w-full rounded-xl bg-forest-600 px-5 py-3 text-sm font-bold text-white hover:bg-forest-800"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
