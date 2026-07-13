"use client";

import { useState } from "react";

export default function LoginForm() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/cms/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-triseno-cms": "1" },
        body: JSON.stringify({ pin }),
      });

      if (res.ok) {
        // Full document load, not a client transition: the new session cookie has to be
        // attached to the request the server component reads.
        window.location.href = "/edit";
        return;
      }

      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cms-login">
      <form className="cms-login-card" onSubmit={submit}>
        <div className="cms-login-mark">Triseno CMS</div>
        <h1>Sign in</h1>
        <p>Enter the editor password to manage the site.</p>

        <label className="cms-field">
          <span className="cms-label">Password</span>
          <input
            className="cms-input"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            disabled={busy}
          />
        </label>

        <button className="cms-btn cms-btn-primary" type="submit" disabled={busy || !pin}>
          {busy ? "Checking…" : "Unlock editor"}
        </button>

        {error && <div className="cms-error">{error}</div>}

        <p className="cms-note">
          Changes you publish go live on trisenosystems.com in about a minute, and every
          version can be rolled back.
        </p>
      </form>
    </div>
  );
}
