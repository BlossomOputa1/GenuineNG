import { useState } from "react";
import Icon from "../../components/Icon";
import ManufacturerSidebar from "../../components/ManufacturerSidebar";
import ManufacturerBatchesPage from "./ManufacturerBatchesPage";
import ManufacturerDashboardPage from "./ManufacturerDashboardPage";
import ManufacturerProductsPage from "./ManufacturerProductsPage";
import ManufacturerSimplePage from "./ManufacturerSimplePage";
import GenerateCodesPage from "./GenerateCodesPage";
import ScanActivityPage from "./ScanActivityPage";

function pageTitle(routePath) {
  if (routePath === "/manufacturer/products") return "Products";
  if (routePath === "/manufacturer/batches") return "Batches";
  if (routePath === "/manufacturer/generate-codes") return "Generate Codes";
  if (routePath === "/manufacturer/scan-activity") return "Scan Activity";
  if (routePath === "/manufacturer/team") return "Team";
  if (routePath === "/manufacturer/settings") return "Settings";
  return "Overview";
}

export default function ManufacturerPortalPage({ routePath, navigate, onSignOut }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = pageTitle(routePath);
  const profile = { companyName: "Approved manufacturer", initials: "AM" };

  let content = <ManufacturerDashboardPage navigate={navigate} profile={manufacturerProfile} />;
  if (routePath === "/manufacturer/products") content = <ManufacturerProductsPage />;
  else if (routePath === "/manufacturer/batches") content = <ManufacturerBatchesPage navigate={navigate} />;
  else if (routePath === "/manufacturer/generate-codes") content = <GenerateCodesPage />;
  else if (routePath === "/manufacturer/scan-activity") content = <ScanActivityPage />;
  else if (routePath === "/manufacturer/team") content = <ManufacturerSimplePage page="team" />;
  else if (routePath === "/manufacturer/settings") content = <ManufacturerSimplePage page="settings" />;

  return (
    <div className={`manufacturer-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <button type="button" className="manufacturer-mobile-toggle" onClick={() => setMobileOpen(true)} aria-label="Open manufacturer navigation"><span /><span /><span /></button>
      <ManufacturerSidebar
        routePath={routePath}
        navigate={navigate}
        profile={manufacturerProfile}
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
            <button type="button" className="manufacturer-topbar-profile" onClick={() => navigate("/manufacturer/settings")}><span>{manufacturerProfile.companyName}</span><b>{manufacturerProfile.initials}</b></button>
          </div>
        </header>
        <div className="manufacturer-content">{content}</div>
        <footer className="manufacturer-footer"><span>GenuineNG manufacturer portal</span><span><Icon name="shield" size={14} /> Layer 2 issuing workspace</span></footer>
      </main>
    </div>
  );
}
