import { useEffect, useRef, useState } from "react";
import Icon from "../components/Icon";
import { getApiBaseUrl } from "../services/api";
import { supabase } from "../services/supabase";

const emptyForm = {
  companyName: "",
  contactPersonName: "",
  businessEmail: "",
  phoneNumber: "",
};
export default function PartnerApplicationPage({
  navigate,
  session,
  authLoading = false,
}) {
  const userId = session?.user?.id || null;
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const [access, setAccess] = useState({
    userId: null,
    approved: false,
    error: "",
  });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (authLoading || !userId) return undefined;

    let active = true;

    async function checkAccess() {
      setAccess({ userId: null, approved: false, error: "" });

      try {
        if (!supabase) {
          throw new Error("Your account session is unavailable.");
        }

        const { data, error } = await supabase
          .from("manufacturers")
          .select("approved")
          .eq("user_id", userId)
          .maybeSingle();

        if (error) throw error;
        if (!active) return;

        const approved = data?.approved === true;
        setAccess({ userId, approved, error: "" });

        if (approved) {
          navigateRef.current("/manufacturer", true);
        }
      } catch (problem) {
        if (!active) return;

        setAccess({
          userId,
          approved: false,
          error: problem.message || "Could not verify manufacturer access.",
        });
      }
    }

    checkAccess();

    return () => {
      active = false;
    };
  }, [authLoading, userId, retry]);

  if (
    authLoading ||
    (userId && (access.userId !== userId || access.approved))
  ) {
    return (
      <section className="placeholder-page">
        <div className="empty-state" role="status">
          <p>
            {access.userId === userId && access.approved
              ? "Opening manufacturer portal…"
              : "Checking your account…"}
          </p>
        </div>
      </section>
    );
  }

  if (userId && access.error) {
    return (
      <section className="placeholder-page">
        <div className="empty-state">
          <h2>Could not check manufacturer access.</h2>
          <p role="alert">{access.error}</p>
          <button
            type="button"
            className="button primary"
            onClick={() => setRetry((value) => value + 1)}
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  return <PartnerApplicationForm navigate={navigate} />;
}
function PartnerApplicationForm({ navigate }) {
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/partner-applications`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const body = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(
          body?.error?.message || "Could not submit the application.",
        );
      setSubmitted(true);
      setForm(emptyForm);
    } catch (problem) {
      setError(problem.message || "Could not submit the application.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="partner-application-page">
      <div className="partner-application-copy">
        <span className="eyebrow">MANUFACTURER PARTNERS</span>
        <h1>Apply to become a GenuineNG partner.</h1>
        <p>
          Applications are reviewed manually. Approved manufacturers can
          register products and batches, generate signed unit QR codes, export
          production files and view scan activity.
        </p>
        <button
          type="button"
          className="text-button"
          onClick={() => navigate("/manufacturer")}
        >
          Already approved? Open manufacturer portal{" "}
          <Icon name="arrow" size={15} />
        </button>
      </div>
      <div className="partner-application-card">
        {submitted ? (
          <div className="partner-application-success">
            <span>
              <Icon name="check" size={22} />
            </span>
            <h2>Application received.</h2>
            <p>
              GenuineNG has been notified. Use the same business email for your
              GenuineNG account so approval can activate your Manufacturer
              Portal and in-app notification.
            </p>
            <button
              type="button"
              className="button secondary"
              onClick={() => setSubmitted(false)}
            >
              Submit another application
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h2>Partner application</h2>
            <label>
              Company name
              <input
                required
                maxLength="160"
                value={form.companyName}
                onChange={(e) =>
                  setForm({ ...form, companyName: e.target.value })
                }
              />
            </label>
            <label>
              Contact person’s name
              <input
                required
                maxLength="120"
                value={form.contactPersonName}
                onChange={(e) =>
                  setForm({ ...form, contactPersonName: e.target.value })
                }
              />
            </label>
            <label>
              Business email
              <input
                required
                type="email"
                maxLength="254"
                value={form.businessEmail}
                onChange={(e) =>
                  setForm({ ...form, businessEmail: e.target.value })
                }
              />
            </label>
            <label>
              Phone number
              <input
                required
                type="tel"
                maxLength="40"
                value={form.phoneNumber}
                onChange={(e) =>
                  setForm({ ...form, phoneNumber: e.target.value })
                }
              />
            </label>
            {error && (
              <div className="inline-notice form-error">
                <Icon name="warning" size={17} />
                <p>{error}</p>
              </div>
            )}
            <button className="button primary full-width" disabled={busy}>
              {busy ? "Submitting…" : "Apply to become a partner"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
