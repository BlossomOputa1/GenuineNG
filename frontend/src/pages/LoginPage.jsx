import { useEffect, useState } from "react";
import AuthMascots from "../components/AuthMascots";
import Icon from "../components/Icon";
import {
  sendPasswordReset,
  signInWithPassword,
  signUpWithPassword,
} from "../services/authService";
import { supabaseConfigured } from "../services/supabase";

export default function LoginPage({ session, navigate }) {
  const [mode, setMode] = useState("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [activeField, setActiveField] = useState("");
  const [busy, setBusy] = useState(false);
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
    setActiveField("");
  }

  const isTyping =
    (activeField === "email" && email.length > 0) ||
    (activeField === "password" && password.length > 0);

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
          <AuthMascots
            focusTarget={activeField}
            isTyping={isTyping}
            privacyMode={passwordVisible}
          />
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
                    onFocus={() => setActiveField("name")}
                    onBlur={() => setActiveField("")}
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
                  onFocus={() => setActiveField("email")}
                  onBlur={() => setActiveField("")}
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
                    onFocus={() => setActiveField("password")}
                    onBlur={() => setActiveField("")}
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
