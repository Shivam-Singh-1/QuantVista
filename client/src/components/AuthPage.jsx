import React, { useMemo, useState } from "react";
import { Activity, Lock, Mail, UserRound } from "lucide-react";

function AuthPage({ apiBaseUrl, initialMode = "login", onAuthSuccess }) {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  const heading = useMemo(
    () => (isSignup ? "Create your market account" : "Welcome back"),
    [isSignup],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Email and password are required");
      return;
    }

    if (isSignup) {
      if (name.trim().length < 2) {
        setError("Name must be at least 2 characters");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
    }

    setLoading(true);

    try {
      const endpoint = isSignup ? "signup" : "login";
      const payload = isSignup
        ? { name: name.trim(), email: email.trim(), password }
        : { email: email.trim(), password };

      const response = await fetch(`${apiBaseUrl}/api/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      onAuthSuccess(data);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 lg:px-8">
      <div className="grain-overlay" />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 lg:flex-row lg:items-stretch">
        <section
          className="relative overflow-hidden rounded-3xl border p-8 lg:w-3/5"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
            boxShadow: "var(--shadow)",
          }}
        >
          <div
            className="absolute -right-20 -top-20 h-52 w-52 rounded-full"
            style={{ background: "var(--accent-soft)" }}
          />
          <div
            className="absolute -bottom-14 -left-10 h-36 w-36 rounded-full"
            style={{ background: "var(--accent-soft)" }}
          />

          <div className="relative z-10">
            <div
              className="mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
              style={{
                borderColor: "var(--border)",
                color: "var(--text-muted)",
                background: "var(--card-strong)",
              }}
            >
              <Activity size={14} style={{ color: "var(--accent)" }} />
              QuantVista
            </div>

            <h1
              className="mb-3 text-4xl font-bold"
              style={{ color: "var(--text)" }}
            >
              Trade faster with secure access.
            </h1>
            <p
              className="max-w-xl text-sm leading-6"
              style={{ color: "var(--text-muted)" }}
            >
              Sign in to stream real-time stocks, manage personal alerts, and
              track custom ranges. Your session now secures alert rules and live
              socket feeds per account.
            </p>
          </div>
        </section>

        <section
          className="rounded-3xl border p-6 lg:w-2/5"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
            boxShadow: "var(--shadow)",
          }}
        >
          <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            {heading}
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            {isSignup ? "Already registered?" : "New to the app?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(isSignup ? "login" : "signup");
                setError("");
              }}
              className="font-semibold"
              style={{ color: "var(--accent)" }}
            >
              {isSignup ? "Log in" : "Create account"}
            </button>
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {isSignup && (
              <label
                className="block text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                Full name
                <div className="relative mt-1">
                  <UserRound
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--text-muted)" }}
                  />
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded-xl border py-2 pl-9 pr-3 text-sm"
                    style={{
                      background: "var(--card-strong)",
                      color: "var(--text)",
                      borderColor: "var(--border)",
                    }}
                    placeholder="Aarav Sharma"
                  />
                </div>
              </label>
            )}

            <label
              className="block text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              Email
              <div className="relative mt-1">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-muted)" }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border py-2 pl-9 pr-3 text-sm"
                  style={{
                    background: "var(--card-strong)",
                    color: "var(--text)",
                    borderColor: "var(--border)",
                  }}
                  placeholder="you@example.com"
                />
              </div>
            </label>

            <label
              className="block text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              Password
              <div className="relative mt-1">
                <Lock
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-muted)" }}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border py-2 pl-9 pr-3 text-sm"
                  style={{
                    background: "var(--card-strong)",
                    color: "var(--text)",
                    borderColor: "var(--border)",
                  }}
                  placeholder="At least 8 characters"
                />
              </div>
            </label>

            {isSignup && (
              <label
                className="block text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                Confirm password
                <div className="relative mt-1">
                  <Lock
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--text-muted)" }}
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full rounded-xl border py-2 pl-9 pr-3 text-sm"
                    style={{
                      background: "var(--card-strong)",
                      color: "var(--text)",
                      borderColor: "var(--border)",
                    }}
                    placeholder="Repeat password"
                  />
                </div>
              </label>
            )}

            {error && (
              <p
                className="rounded-xl border px-3 py-2 text-xs"
                style={{
                  color: "var(--loss)",
                  borderColor: "var(--loss)",
                  background: "color-mix(in srgb, var(--loss) 8%, transparent)",
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl px-4 py-2 text-sm font-semibold transition-opacity"
              style={{
                background: "var(--accent)",
                color: "#fff",
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "wait" : "pointer",
              }}
            >
              {loading
                ? isSignup
                  ? "Creating account..."
                  : "Signing in..."
                : isSignup
                  ? "Create account"
                  : "Log in"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default AuthPage;
