import Icon from "../../components/Icon";
import { manufacturerScanActivity } from "../../data/manufacturerDemo";

const formatNumber = (value) => new Intl.NumberFormat("en-NG").format(value);

export default function ScanActivityPage() {
  const totalScans = manufacturerScanActivity.reduce((sum, item) => sum + item.scans, 0);
  const totalSignals = manufacturerScanActivity.reduce((sum, item) => sum + item.reuseSignals, 0);
  const maxScans = Math.max(...manufacturerScanActivity.map((item) => item.scans));

  return (
    <div className="manufacturer-page">
      <section className="manufacturer-page-intro compact">
        <div>
          <span className="manufacturer-eyebrow">VERIFICATION</span>
          <h1>Scan activity</h1>
          <p>Aggregate customer verification activity and simple reuse signals across issued codes.</p>
        </div>
      </section>

      <section className="manufacturer-mini-stat-grid">
        <article><small>Total scans</small><strong>{formatNumber(totalScans)}</strong><span>Across recent batches</span></article>
        <article><small>Possible reuse signals</small><strong>{formatNumber(totalSignals)}</strong><span>Signals only, not counterfeit verdicts</span></article>
        <article><small>Products with activity</small><strong>{manufacturerScanActivity.length}</strong><span>Current demo view</span></article>
      </section>

      <section className="manufacturer-panel manufacturer-activity-panel">
        <div className="manufacturer-panel-heading"><div><span className="manufacturer-eyebrow">BY PRODUCT</span><h2>Verification activity</h2></div></div>
        <div className="manufacturer-activity-chart-list">
          {manufacturerScanActivity.map((item) => (
            <article key={item.id}>
              <div className="manufacturer-activity-copy"><span><strong>{item.productName}</strong><small>{item.batchCode}</small></span><span><strong>{formatNumber(item.scans)}</strong><small>scans</small></span></div>
              <div className="manufacturer-activity-bar"><i style={{ width: `${Math.max(12, (item.scans / maxScans) * 100)}%` }} /></div>
              <div className="manufacturer-activity-footer"><span className={`manufacturer-reuse-state ${item.reuseSignals ? "warning" : "clear"}`}>{item.reuseSignals ? <><Icon name="warning" size={14} /> {item.reuseSignals} possible reuse signals</> : <><Icon name="check" size={14} /> No unusual activity detected</>}</span><small>{item.trend} scans</small></div>
            </article>
          ))}
        </div>
      </section>

      <section className="manufacturer-signal-explainer">
        <Icon name="info" size={20} />
        <p><strong>Reuse signals are not counterfeit verdicts.</strong> They indicate unusual scan patterns for a unit code and should prompt review rather than automatically classifying the physical product.</p>
      </section>
    </div>
  );
}
