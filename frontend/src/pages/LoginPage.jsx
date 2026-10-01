import { useEffect, useState } from "react";
import Icon from "../components/Icon";
import {
  sendPasswordReset,
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
} from "../services/authService";
import { supabaseConfigured } from "../services/supabase";

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.1 3.5 2.7.2.1c2.2-2 3.8-5 3.8-8.9z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.1.1-3.6 2.8-.1.1C3.4 21.4 7.4 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.1-3.6-2.8-.1.1C.5 8.6 0 10.2 0 12s.5 3.4 1.4 4.9l3.8-2.5z"
      />
      <path
        fill="#EA4335"
        d="M12 4.6c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.4 0 3.4 2.6 1.4 6.8l3.8 2.9c1-2.9 3.7-5.1 6.8-5.1z"
      />
    </svg>
  );
}

export default function LoginPage({ session, navigate }) {
  const [mode, setMode] = useState("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (session?.user) {
      navigate("/app", true);
    }
  }, [session?.user?.id, navigate]);

  if (session?.user) return null;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "signup") {
        const data = await signUpWithPassword({ email, password, fullName });
        if (data.session) navigate("/app");
        else
          setMessage(
            "Account created. Check your email to confirm the address, then sign in.",
          );
      } else {
        await signInWithPassword(email, password);
        navigate("/app");
      }
    } catch (problem) {
      setError(problem.message || "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function continueWithGoogle() {
    setOauthBusy(true);
    setError("");
    setMessage("");
    try {
      await signInWithGoogle();
    } catch (problem) {
      setError(problem.message || "Google sign-in failed.");
      setOauthBusy(false);
    }
  }

  async function forgot() {
    if (!email.trim()) {
      setError("Enter your email first, then choose Forgot password.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await sendPasswordReset(email.trim());
      setMessage("Password reset link sent. Check your email.");
    } catch (problem) {
      setError(problem.message || "Could not send a password reset email.");
    } finally {
      setBusy(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
    setPasswordVisible(false);
  }

  return (
    <>
      <button
        type="button"
        className="back-link auth-back-link"
        onClick={() => navigate("/")}
      >
        <Icon name="back" size={17} /> Back to main
      </button>
      <div className="login-layout auth-only-layout auth-interactive-layout">
        <aside className="auth-visual-panel">
          <div className="auth-photo-scene">
            <img
              src="/images/auth-qr-scan.webp"
              alt="Customer scanning the QR code on a bottled drink at a shop counter"
              width="1080"
              height="1080"
            />
          </div>
        </aside>

        <section className="login-panel real-auth-panel">
          <a
            className="auth-brand-lockup"
            href="/"
            onClick={(event) => {
              event.preventDefault();
              navigate("/");
            }}
            aria-label="GenuineNG home"
          >
            <img src="/icons/favicon.svg" alt="" width="36" height="36" />
            <span>
              Genuine<span className="brand-suffix">NG</span>
            </span>
          </a>

          <div
            key={`heading-${mode}`}
            className="auth-heading auth-heading-motion"
          >
            <h1>
              {mode === "signup" ? "Create your account." : "Welcome back."}
            </h1>
            <p>
              {mode === "signup"
                ? "Set up your GenuineNG account."
                : "Sign in to continue."}
            </p>
          </div>

          <div
            className={`auth-mode-tabs ${mode === "signup" ? "show-signup" : "show-signin"}`}
          >
            <button
              type="button"
              className={mode === "signin" ? "active" : ""}
              onClick={() => changeMode("signin")}
            >
              Sign in
            </button>
            <button
              type="button"
              className={mode === "signup" ? "active" : ""}
              onClick={() => changeMode("signup")}
            >
              Create account
            </button>
          </div>

          <div
            key={`auth-content-${mode}`}
            className={`auth-mode-content auth-mode-content-${mode}`}
          >
            {!supabaseConfigured && (
              <div className="inline-notice form-error">
                <Icon name="info" />
                <p>
                  Supabase is not configured yet. Add{" "}
                  <code>VITE_SUPABASE_URL</code> and{" "}
                  <code>VITE_SUPABASE_ANON_KEY</code> to{" "}
                  <code>frontend/.env.local</code>.
                </p>
              </div>
            )}

            <form onSubmit={submit}>
              {mode === "signup" && (
                <div className="field">
                  <label htmlFor="auth-name">Full name</label>
                  <input
                    id="auth-name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    autoComplete="name"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              )}

              <div className="field">
                <label htmlFor="auth-email">Email</label>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="auth-password">Password</label>
                <div className="auth-password-wrap">
                  <input
                    id="auth-password"
                    type={passwordVisible ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={
                      mode === "signup" ? "new-password" : "current-password"
                    }
                    placeholder={
                      mode === "signup"
                        ? "Create a password"
                        : "Enter your password"
                    }
                    minLength="8"
                    required
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    aria-label={
                      passwordVisible ? "Hide password" : "Show password"
                    }
                    aria-pressed={passwordVisible}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setPasswordVisible((value) => !value)}
                  >
                    <Icon name={passwordVisible ? "eyeOff" : "eye"} size={18} />
                  </button>
                </div>
              </div>

              <p className="auth-legal-note">
                {mode === "signup"
                  ? "By creating your account, you agree to our "
                  : "By continuing, you agree to our "}
                <a
                  href="/privacy"
                  onClick={(event) => {
                    event.preventDefault();
                    navigate("/privacy");
                  }}
                >
                  Privacy Policy
                </a>{" "}
                and{" "}
                <a
                  href="/terms"
                  onClick={(event) => {
                    event.preventDefault();
                    navigate("/terms");
                  }}
                >
                  Terms of Service
                </a>
                .
              </p>

              {error && (
                <div className="inline-notice form-error" role="alert">
                  <Icon name="warning" />
                  <p>{error}</p>
                </div>
              )}
              {message && (
                <div className="inline-notice" role="status">
                  <Icon name="check" />
                  <p>{message}</p>
                </div>
              )}
              <button
                type="submit"
                className="button primary full-width"
                disabled={busy || !supabaseConfigured}
              >
                {busy
                  ? "Please wait…"
                  : mode === "signup"
                    ? "Create account"
                    : "Sign in"}{" "}
                {!busy && <Icon name="arrow" />}
              </button>

              <div className="auth-divider" aria-hidden="true">
                <span>or</span>
              </div>

              <button
                type="button"
                className="button secondary full-width auth-google-button"
                onClick={continueWithGoogle}
                disabled={busy || oauthBusy || !supabaseConfigured}
              >
                <GoogleMark />
                {oauthBusy ? "Opening Google…" : "Continue with Google"}
              </button>
            </form>

            {mode === "signin" && (
              <button
                type="button"
                className="text-button auth-forgot"
                onClick={forgot}
                disabled={busy}
              >
                Forgot password?
              </button>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
