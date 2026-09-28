import { lazy, Suspense, useEffect, useState } from "react";
import Icon from "../../components/Icon";
import ManufacturerSidebar from "../../components/ManufacturerSidebar";
import { supabase } from "../../services/supabase";
const ManufacturerBatchesPage = lazy(() => import("./ManufacturerBatchesPage"));
const ManufacturerDashboardPage = lazy(() => import("./ManufacturerDashboardPage"));
const ManufacturerProductsPage = lazy(() => import("./ManufacturerProductsPage"));
const ManufacturerSimplePage = lazy(() => import("./ManufacturerSimplePage"));
const ManufacturerCompanyProfilePage = lazy(() => import("./ManufacturerCompanyProfilePage"));
const GenerateCodesPage = lazy(() => import("./GenerateCodesPage"));
const ScanActivityPage = lazy(() => import("./ScanActivityPage"));

function pageTitle(routePath) {
  if (routePath === "/manufacturer/products") return "Products";
  if (routePath === "/manufacturer/batches") return "Batches";
  if (routePath === "/manufacturer/generate-codes") return "Generate Codes";
  if (routePath === "/manufacturer/scan-activity") return "Scan Activity";
  if (routePath === "/manufacturer/team") return "Team";
  if (routePath === "/manufacturer/profile") return "Company Profile";
  return "Overview";
}

export default function ManufacturerPortalPage({ routePath, navigate, session, onSignOut }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const title = pageTitle(routePath);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      setProfileLoading(true);
      setProfileError("");
      try {
        if (!supabase || !session?.user?.id) throw new Error("Your account session is unavailable.");
        const { data, error } = await supabase
          .from("manufacturers")
          .select("company_name, contact_person_name, business_email, phone_number, approved, approved_at")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (error) throw error;
        if (active) {
          setProfile(data?.approved ? {
            companyName: data.company_name || "Approved manufacturer",
            initials: (data.company_name || "AM").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
            status: "Approved manufacturer",
            contactPersonName: data.contact_person_name || "",
            businessEmail: data.business_email || "",
            phoneNumber: data.phone_number || "",
          } : null);
        }
      } catch (problem) {
        if (active) setProfileError(problem.message || "Could not verify manufacturer access.");
      } finally {
        if (active) setProfileLoading(false);
      }
    }
    loadProfile();
    return () => { active = false; };
  }, [session?.user?.id]);

  if (profileLoading) return <main className="manufacturer-main"><div className="manufacturer-content"><div className="empty-state"><p>Verifying manufacturer access...</p></div></div></main>;
  if (profileError || !profile) return <main className="manufacturer-main"><div className="manufacturer-content"><div className="empty-state"><h1>Manufacturer access required</h1><p>{profileError || "This account is not an approved manufacturer."}</p><button type="button" className="manufacturer-secondary-button" onClick={() => navigate("/app")}>Go to workspace</button></div></div></main>;

  let content = <ManufacturerDashboardPage navigate={navigate} profile={profile} />;
  if (routePath === "/manufacturer/products") content = <ManufacturerProductsPage />;
  else if (routePath === "/manufacturer/batches") content = <ManufacturerBatchesPage navigate={navigate} />;
  else if (routePath === "/manufacturer/generate-codes") content = <GenerateCodesPage />;
  else if (routePath === "/manufacturer/scan-activity") content = <ScanActivityPage />;
  else if (routePath === "/manufacturer/team") content = <ManufacturerSimplePage page="team" />;
  else if (routePath === "/manufacturer/profile") content = <ManufacturerCompanyProfilePage profile={profile} />;

  return (
    <div className={`manufacturer-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <button type="button" className="manufacturer-mobile-toggle" onClick={() => setMobileOpen(true)} aria-label="Open manufacturer navigation"><span /><span /><span /></button>
      <ManufacturerSidebar
        routePath={routePath}
        navigate={navigate}
        profile={profile}
        onSignOut={onSignOut}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <main className="manufacturer-main">
        <header className="manufacturer-topbar">
          <div><span>GENUINENG LAYER 2</span><strong>{title}</strong></div>
          <div className="manufacturer-topbar-actions">
            <span className="manufacturer-approved-badge"><i /> Approved</span>
            <button type="button" className="manufacturer-topbar-profile" onClick={() => navigate("/manufacturer/profile")}><span>{profile?.companyName || "Approved manufacturer"}</span><b>{profile?.initials || "AM"}</b></button>
          </div>
        </header>
        <div className="manufacturer-content"><Suspense fallback={<div className="empty-state"><p>Loading portal view...</p></div>}>{content}</Suspense></div>
        <footer className="manufacturer-footer"><span>GenuineNG manufacturer portal</span><span><Icon name="shield" size={14} /> Layer 2 issuing workspace</span></footer>
      </main>
    </div>
  );
}
