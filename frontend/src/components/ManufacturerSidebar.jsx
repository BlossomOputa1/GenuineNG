import Icon from "./Icon";

const navGroups = [
  {
    items: [
      { label: "Overview", path: "/manufacturer", icon: "dashboard" },
      { label: "Products", path: "/manufacturer/products", icon: "package" },
      { label: "Batches", path: "/manufacturer/batches", icon: "layers" },
      {
        label: "Generate Codes",
        path: "/manufacturer/generate-codes",
        icon: "qr",
      },
      {
        label: "Scan Activity",
        path: "/manufacturer/scan-activity",
        icon: "chart",
      },
    ],
  },
];

function routeActive(routePath, path) {
  if (path === "/manufacturer") return routePath === path;
  return routePath === path || routePath.startsWith(`${path}/`);
}

export default function ManufacturerSidebar({
  routePath,
  navigate,
  profile,
  onSignOut,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}) {
  function go(path) {
    setMobileOpen(false);
    navigate(path);
  }

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="manufacturer-sidebar-scrim"
          aria-label="Close manufacturer navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={`manufacturer-sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="manufacturer-sidebar-top">
          <button
            type="button"
            className="manufacturer-brand"
            onClick={() => (collapsed ? setCollapsed(false) : go("/"))}
            title={collapsed ? "Expand sidebar" : "GenuineNG home"}
          >
            <span className="manufacturer-brand-mark">
              <img src="/icons/favicon.svg" alt="" />
              {collapsed && (
                <span className="manufacturer-brand-expand">
                  <Icon name="sidebarOpen" size={18} />
                </span>
              )}
            </span>
            <span className="manufacturer-brand-copy">
              <strong>
                Genuine<span>NG</span>
              </strong>
              <small>MANUFACTURER</small>
            </span>
          </button>
          <button
            type="button"
            className="manufacturer-collapse"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Icon name={collapsed ? "arrow" : "back"} size={17} />
          </button>
          <button
            type="button"
            className="manufacturer-mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <Icon name="close" size={19} />
          </button>
        </div>

        <button
          type="button"
          className="manufacturer-primary-action"
          onClick={() => go("/manufacturer/generate-codes")}
          title="Generate Codes"
        >
          <Icon name="qr" size={18} />
          <span>Generate Codes</span>
        </button>

        <nav
          className="manufacturer-nav"
          aria-label="Manufacturer portal navigation"
        >
          {navGroups.map((group, groupIndex) => (
            <div
              className="manufacturer-nav-group"
              key={group.label || groupIndex}
            >
              {group.label && (
                <span className="manufacturer-nav-label">{group.label}</span>
              )}
              {group.items.map((item) => (
                <button
                  type="button"
                  key={item.path}
                  className={routeActive(routePath, item.path) ? "active" : ""}
                  onClick={() => go(item.path)}
                  title={item.label}
                >
                  <Icon name={item.icon} size={18} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="manufacturer-sidebar-bottom">
          <button
            type="button"
            className="manufacturer-consumer-link"
            onClick={() => go("/app")}
            title="Consumer workspace"
          >
            <Icon name="scan" size={17} />
            <span>Consumer workspace</span>
          </button>

          <div className="manufacturer-profile-card">
            <div className="manufacturer-avatar">
              {profile?.initials || "AM"}
            </div>
            <div>
              <strong>{profile?.companyName || "Approved manufacturer"}</strong>
              <span>{profile?.status || "Approved manufacturer"}</span>
            </div>
          </div>

          <button
            type="button"
            className="manufacturer-signout"
            onClick={onSignOut}
            title="Sign out"
          >
            <Icon name="logout" size={17} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
