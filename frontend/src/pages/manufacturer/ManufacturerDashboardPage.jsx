import { useEffect, useState } from "react";
import Icon from "../../components/Icon";
import {
  getBatches,
  getProducts,
  getScanActivity,
  getBillingConfig,
  getTokenAccount,
} from "../../services/manufacturerApi";

const formatNumber = (value) =>
  new Intl.NumberFormat("en-NG").format(value || 0);

const getDayGreeting = (date = new Date()) => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
};
export default function ManufacturerDashboardPage({ navigate, profile }) {
  const safeProfile = profile || { companyName: "Approved manufacturer" };
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([getProducts(), getBatches(), getScanActivity(), getBillingConfig()])
      .then(async ([products, batches, activity, billing]) =>
        setData({ products, batches, activity, billing, tokens: billing.enabled ? await getTokenAccount() : null }),
      )
      .catch((problem) =>
        setError(problem.message || "Could not load manufacturer overview."),
      );
  }, []);
  if (error)
    return (
      <div className="manufacturer-page">
        <div className="inline-notice" role="alert">
          <Icon name="info" size={18} />
          <p>{error}</p>
        </div>
      </div>
    );
  if (!data)
    return (
      <div className="manufacturer-page">
        <div className="empty-state">
          <p>Loading manufacturer overview...</p>
        </div>
      </div>
    );
  const { products, batches, activity, tokens } = data;
  const generated = batches.reduce(
    (sum, batch) => sum + (batch.codesGenerated || 0),
    0,
  );
  const lagosHour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos', hour: 'numeric', hourCycle: 'h23',
  }).format(new Date()));
  const greeting = lagosHour < 12 ? 'morning' : lagosHour < 17 ? 'afternoon' : 'evening';
  const stats = [
    { label: "Tokens left", value: tokens ? formatNumber(tokens.balance) : "—", icon: "qr" },
    { label: "Registered products", value: products.length, icon: "package" },
    { label: "Production batches", value: batches.length, icon: "layers" },
    { label: "Codes generated", value: formatNumber(generated), icon: "qr" },
    {
      label: "Recorded scans",
      value: formatNumber(activity.totalScans),
      icon: "chart",
    },
  ];
  return (
    <div className="manufacturer-page manufacturer-dashboard-page">
      <section className="manufacturer-page-intro">
        <div>
          <span className="manufacturer-eyebrow">OVERVIEW</span>
          <h1>Good {greeting}, {safeProfile.companyName}.</h1>
          <p>
            Manage registered products, production batches and GenuineNG codes
            from one place.
          </p>
        </div>
        <button
          className="manufacturer-lime-button"
          type="button"
          onClick={() => navigate("/manufacturer/generate-codes")}
        >
          <Icon name="qr" size={17} /> Generate codes
        </button>
      </section>
      <section
        id="manufacturer-dashboard-stats"
        className="manufacturer-stat-grid"
        aria-label="Manufacturer statistics"
      >
        {stats.map((stat) => (
          <article className="manufacturer-stat-card" key={stat.label}>
            <span className="manufacturer-stat-icon">
              <Icon name={stat.icon} size={19} />
            </span>
            <div>
              <small>{stat.label}</small>
              <strong>{stat.value}</strong>
            </div>
          </article>
        ))}
      </section>
      <div className="manufacturer-dashboard-grid">
        <section className="manufacturer-panel">
          <div className="manufacturer-panel-heading">
            <div>
              <span className="manufacturer-eyebrow">PRODUCTION</span>
              <h2>Recent batches</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate("/manufacturer/batches")}
            >
              View all <Icon name="arrow" size={14} />
            </button>
          </div>
          <div className="manufacturer-list-stack">
            {batches.slice(0, 5).map((batch) => (
              <button
                type="button"
                className="manufacturer-list-row"
                key={batch.id}
                onClick={() => navigate("/manufacturer/batches")}
              >
                <span className="manufacturer-list-icon">
                  <Icon name="layers" size={18} />
                </span>
                <span className="manufacturer-list-main">
                  <strong>{batch.productName}</strong>
                  <small>
                    {batch.batchCode} · {formatNumber(batch.unitsProduced)}{" "}
                    units
                  </small>
                </span>
                <span className={`manufacturer-status-chip ${batch.status}`}>
                  {batch.status === "generated"
                    ? "Generated"
                    : batch.status === "partial"
                      ? "Resume"
                      : "Ready"}
                </span>
                <Icon name="arrow" size={15} />
              </button>
            ))}
          </div>
        </section>
        <section className="manufacturer-panel">
          <div className="manufacturer-panel-heading">
            <div>
              <span className="manufacturer-eyebrow">VERIFICATION</span>
              <h2>Recent scan activity</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate("/manufacturer/scan-activity")}
            >
              View activity <Icon name="arrow" size={14} />
            </button>
          </div>
          <div className="manufacturer-list-stack">
            {(activity.batches || []).slice(0, 5).map((item) => (
              <article className="manufacturer-activity-row" key={item.batchId}>
                <span className="manufacturer-list-icon">
                  <Icon name="scan" size={18} />
                </span>
                <span className="manufacturer-list-main">
                  <strong>{item.productName}</strong>
                  <small>
                    {item.batchCode} · {formatNumber(item.totalScans)} scans
                  </small>
                </span>
                <strong className="manufacturer-scan-count">{formatNumber(item.totalScans)}</strong>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
