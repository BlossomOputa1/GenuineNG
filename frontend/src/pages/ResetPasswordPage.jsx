import { useEffect, useRef, useState } from "react";
import Icon from "../components/Icon";
import { updatePassword } from "../services/authService";
import { supabase, supabaseConfigured } from "../services/supabase";

async function establishRecoverySession() {
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  const linkError =
    params.get("error_description") || hash.get("error_description");

  if (linkError) throw new Error(linkError);

  const code = params.get("code");
  const tokenHash = params.get("token_hash") || params.get("token");
  const accessToken = params.get("access_token") || hash.get("access_token");
  const refreshToken = params.get("refresh_token") || hash.get("refresh_token");

  // Wait for Supabase's automatic URL/session handling first.
  let response = await supabase.auth.getSession();
  if (response.error) throw response.error;

  if (tokenHash) {
    response = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });
  } else if (!response.data?.session) {
    if (code) {
      response = await supabase.auth.exchangeCodeForSession(code);
    } else if (accessToken && refreshToken) {
      response = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }
  }

  if (response.error) throw response.error;

  if (!response.data?.session) {
    throw new Error("This password reset link is missing or expired.");
  }

  // Remove recovery credentials from the address bar.
  window.history.replaceState(
    window.history.state,
    "",
    window.location.pathname,
  );
}

export default function ResetPasswordPage({ navigate }) {
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checkingRecovery, setCheckingRecovery] = useState(true);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [error, setError] = useState("");
  const recoveryRequest = useRef(null);

  useEffect(() => {
    if (!supabaseConfigured || !supabase) {
      setError("Password recovery is not configured.");
      setCheckingRecovery(false);
      return undefined;
    }

    let mounted = true;

    // Reuse the same request during React StrictMode effect replay.
    if (!recoveryRequest.current) {
      recoveryRequest.current = establishRecoverySession();
    }

    recoveryRequest.current
      .then(() => {
        if (mounted) setRecoveryReady(true);
      })
      .catch((problem) => {
        if (mounted) {
          setError(
            problem.message ||
              "This password reset link is invalid or expired.",
          );
        }
      })
      .finally(() => {
        if (mounted) setCheckingRecovery(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (busy || !recoveryReady) return;

    setBusy(true);
    setError("");
    let updated = passwordUpdated;

    try {
      if (!updated) {
        await updatePassword(password);
        updated = true;
        setPasswordUpdated(true);
        setPassword("");
      }

      const { error: signOutError } = await supabase.auth.signOut({
        scope: "local",
      });

      if (signOutError) throw signOutError;

      navigate("/login", true);
    } catch (problem) {
      setError(
        updated
          ? "Your password was updated, but sign-out could not finish. Try again to return to sign in."
          : problem.message || "Could not update your password.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="reset-password-wrap">
      <section className="login-panel">
        <span className="eyebrow">RESET PASSWORD</span>
        <h2>
          {passwordUpdated ? "Password updated." : "Choose a new password."}
        </h2>

        {checkingRecovery ? (
          <p role="status">Verifying your password reset link…</p>
        ) : !recoveryReady ? (
          <div className="inline-notice form-error" role="alert">
            <Icon name="warning" />
            <p>{error}</p>
          </div>
        ) : (
          <form onSubmit={submit} aria-busy={busy}>
            {!passwordUpdated && (
              <div className="field">
                <label htmlFor="new-password">New password</label>
                <div className="auth-password-wrap">
                  <input
                    id="new-password"
                    type={passwordVisible ? "text" : "password"}
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter a new password"
                    autoComplete="new-password"
                    disabled={busy}
                    required
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    aria-label={
                      passwordVisible ? "Hide password" : "Show password"
                    }
                    aria-pressed={passwordVisible}
                    disabled={busy}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setPasswordVisible((value) => !value)}
                  >
                    <Icon name={passwordVisible ? "eyeOff" : "eye"} size={18} />
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="inline-notice form-error" role="alert">
                <Icon name="warning" />
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="button primary full-width"
              disabled={busy}
            >
              {busy
                ? passwordUpdated
                  ? "Returning to sign in…"
                  : "Updating…"
                : passwordUpdated
                  ? "Return to sign in"
                  : "Update password"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
