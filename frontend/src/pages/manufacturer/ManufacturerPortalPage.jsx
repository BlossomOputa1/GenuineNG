import { lazy, Suspense, useEffect, useRef, useState } from "react";
import ContactForm from "../../components/ContactForm";
import Icon from "../../components/Icon";
import ManufacturerSidebar from "../../components/ManufacturerSidebar";
import { supabase } from "../../services/supabase";

const ManufacturerBatchesPage = lazy(() => import("./ManufacturerBatchesPage"));
const ManufacturerDashboardPage = lazy(
  () => import("./ManufacturerDashboardPage"),
);
const ManufacturerProductsPage = lazy(
  () => import("./ManufacturerProductsPage"),
);
const GenerateCodesPage = lazy(() => import("./GenerateCodesPage"));
const ScanActivityPage = lazy(() => import("./ScanActivityPage"));
const PaymentsPage = lazy(() => import("./PaymentsPage"));

function pageTitle(routePath) {
  if (routePath === "/manufacturer/products") return "Products";
  if (routePath === "/manufacturer/batches") return "Batches";
  if (routePath === "/manufacturer/generate-codes") return "Generate Codes";
  if (routePath === "/manufacturer/scan-activity") return "Scan Activity";
  if (routePath === "/manufacturer/payments") return "Payments";
  return "Overview";
}

export default function ManufacturerPortalPage({
  routePath,
  navigate,
  session,
  onSignOut,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [contactOpen, setContactOpen] = useState(false);
  const contactButtonRef = useRef(null);
  const contactDialogRef = useRef(null);
  const mobileToggleRef = useRef(null);
  const title = pageTitle(routePath);

  function closeContact() {
    setContactOpen(false);
    const focusTarget = window.matchMedia("(max-width: 860px)").matches
      ? mobileToggleRef.current
      : contactButtonRef.current;
    focusTarget?.focus();
  }

  useEffect(() => {
    if (!contactOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    contactDialogRef.current?.querySelector("input")?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        closeContact();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...(contactDialogRef.current?.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
      ) || [])];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [contactOpen]);

  useEffect(() => {
    if (
      routePath === "/manufacturer/team" ||
      routePath === "/manufacturer/profile"
    ) {
      navigate("/manufacturer", true);
    }
  }, [routePath, navigate]);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setProfileLoading(true);
      setProfileError("");

      try {
        if (!supabase || !session?.user?.id) {
          throw new Error("Your account session is unavailable.");
        }

        const { data, error } = await supabase
          .from("manufacturers")
          .select(
            "company_name, contact_person_name, business_email, phone_number, approved, approved_at",
          )
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (error) throw error;

        if (active) {
          setProfile(
            data?.approved
              ? {
                  companyName: data.company_name || "Approved manufacturer",
                  initials: (data.company_name || "AM")
                    .split(/\s+/)
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase(),
                  status: "Approved manufacturer",
                  contactPersonName: data.contact_person_name || "",
                  businessEmail: data.business_email || "",
                  phoneNumber: data.phone_number || "",
                }
              : null,
          );
        }
      } catch (problem) {
        if (active) {
          setProfileError(
            problem.message || "Could not verify manufacturer access.",
          );
        }
      } finally {
        if (active) setProfileLoading(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  if (profileLoading) {
    return (
      <main className="manufacturer-main">
        <div className="manufacturer-content">
          <div className="empty-state" role="status">
            <p>Verifying manufacturer access…</p>
          </div>
        </div>
      </main>
    );
  }

  if (profileError || !profile) {
    return (
      <main className="manufacturer-main">
        <div className="manufacturer-content">
          <div className="empty-state">
            <h1>Manufacturer access required</h1>
            <p>
              {profileError || "This account is not an approved manufacturer."}
            </p>
            <button
              type="button"
              className="manufacturer-secondary-button"
              onClick={() => navigate("/app")}
            >
              Go to Checkspace
            </button>
          </div>
        </div>
      </main>
    );
  }

  let content = (
    <ManufacturerDashboardPage navigate={navigate} profile={profile} />
  );

  if (routePath === "/manufacturer/products") {
    content = <ManufacturerProductsPage />;
  } else if (routePath === "/manufacturer/batches") {
    content = <ManufacturerBatchesPage navigate={navigate} />;
  } else if (routePath === "/manufacturer/generate-codes") {
    content = <GenerateCodesPage navigate={navigate} />;
  } else if (routePath === "/manufacturer/scan-activity") {
    content = <ScanActivityPage />;
  } else if (routePath === "/manufacturer/payments") {
    content = <PaymentsPage navigate={navigate} />;
  }

  return (
    <div
      className={`manufacturer-shell ${collapsed ? "sidebar-collapsed" : ""}`}
    >
      <button
        type="button"
        className="manufacturer-mobile-toggle"
        ref={mobileToggleRef}
        onClick={() => setMobileOpen(true)}
        aria-label="Open manufacturer navigation"
      >
        <span />
        <span />
        <span />
      </button>

      <ManufacturerSidebar
        routePath={routePath}
        navigate={navigate}
        profile={profile}
        onSignOut={onSignOut}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onContact={() => setContactOpen(true)}
        contactButtonRef={contactButtonRef}
      />

      <main className="manufacturer-main">
        <header className="manufacturer-topbar">
          <div>
            <span>GENUINENG LAYER 2</span>
            <strong>{title}</strong>
          </div>

          <div className="manufacturer-topbar-actions">
            <span className="manufacturer-approved-badge">
              <Icon name="verified" size={18} />
              Approved
            </span>

            <div className="manufacturer-topbar-profile">
              <span>{profile.companyName}</span>
              <b>{profile.initials}</b>
            </div>
          </div>
        </header>

        <div className="manufacturer-content">
          <Suspense
            fallback={
              <div className="empty-state" role="status">
                <p>Loading portal view…</p>
              </div>
            }
          >
            {content}
          </Suspense>
        </div>
      </main>
      {contactOpen && (
        <div
          className="contact-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeContact();
          }}
        >
          <section
            ref={contactDialogRef}
            className="partner-application-card contact-card contact-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-form-title"
          >
            <div className="contact-dialog-header">
              <span className="contact-dialog-brand">
                <img src="/icons/favicon.svg" alt="" width="32" height="32" />
                Genuine<span>NG</span>
              </span>
              <button
                type="button"
                className="contact-dialog-close"
                aria-label="Close contact form"
                onClick={closeContact}
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            <ContactForm />
          </section>
        </div>
      )}
    </div>
  );
}
