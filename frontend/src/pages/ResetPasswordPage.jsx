import { useEffect, useState } from "react";
import Icon from "../components/Icon";
import { supabase, supabaseConfigured } from "../services/supabase";
import { updatePassword } from "../services/authService";

export default function ResetPasswordPage({ navigate }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkingRecovery, setCheckingRecovery] = useState(true);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured || !supabase) {
      setError("Password recovery is not configured.");
      setCheckingRecovery(false);
      return undefined;
    }

    let mounted = true;
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const code = params.get("code");
    const accessToken = params.get("access_token") || hash.get("access_token");
    const refreshToken = params.get("refresh_token") || hash.get("refresh_token");
    const token = params.get("token");

    async function establishRecoverySession() {
      try {
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        } else if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        } else if (token) {
          await supabase.auth.verifyOtp({
            token_hash: token,
            type: "recovery",
          });
        }

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!data.session) {
          throw new Error("This password reset link is missing or expired.");
        }
        if (mounted) setRecoveryReady(true);
      } catch (problem) {
        if (mounted) setError(problem.message || "This password reset link is invalid or expired.");
      } finally {
        if (mounted) setCheckingRecovery(false);
      }
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && mounted) {
        setRecoveryReady(true);
        setCheckingRecovery(false);
      }
    });

    establishRecoverySession();
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await updatePassword(password);
      setDone(true);
    } catch (problem) {
      setError(problem.message || "Could not update your password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="reset-password-wrap">
      <section className="login-panel">
        <span className="eyebrow">RESET PASSWORD</span>
        <h2>{done ? "Password updated." : "Choose a new password."}</h2>
        {done ? (
          <button className="button primary" onClick={() => navigate("/app")}>
            Open workspace <Icon name="arrow" />
          </button>
        ) : checkingRecovery ? (
          <p>Verifying your password reset link...</p>
        ) : !recoveryReady ? (
          <div className="inline-notice form-error">
            <Icon name="warning" />
            <p>{error}</p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="new-password">New password</label>
              <input
                id="new-password"
                type="password"
                minLength="8"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {error && (
              <div className="inline-notice form-error">
                <Icon name="warning" />
                <p>{error}</p>
              </div>
            )}
            <button className="button primary full-width" disabled={busy}>
              {busy ? "Updating..." : "Update password"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
