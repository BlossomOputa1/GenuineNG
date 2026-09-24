import { useEffect, useState } from "react";
import Icon from "../../components/Icon";
import { getScanActivity } from "../../services/manufacturerApi";

const formatNumber = (value) => new Intl.NumberFormat("en-NG").format(value || 0);
export default function ScanActivityPage() {
  const [activity, setActivity] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { getScanActivity().then(setActivity).catch((problem) => setError(problem.message || "Could not load scan activity.")); }, []);
  if (error) return <div className="manufacturer-page"><div className="inline-notice" role="alert"><Icon name="info" size={18} /><p>{error}</p></div></div>;
  if (!activity) return <div className="manufacturer-page"><div className="empty-state"><p>Loading scan activity...</p></div></div>;
  const rows = activity.batches || [];
  const maxScans = Math.max(1, ...rows.map((item) => item.totalScans));
  return <div className="manufacturer-page"><section className="manufacturer-page-intro compact"><div><span className="manufacturer-eyebrow">VERIFICATION</span><h1>Scan activity</h1><p>Aggregate customer verification activity and reuse signals across issued codes.</p></div></section><section className="manufacturer-mini-stat-grid"><article><small>Total scans</small><strong>{formatNumber(activity.totalScans)}</strong><span>Across issued batches</span></article><article><small>Possible reuse signals</small><strong>{formatNumber(rows.reduce((sum, item) => sum + item.reuseSignals, 0))}</strong><span>Signals only, not counterfeit verdicts</span></article><article><small>Products with activity</small><strong>{rows.filter((item) => item.totalScans > 0).length}</strong><span>Current account data</span></article></section>{!rows.length ? <div className="empty-state"><h2>No scan activity yet</h2><p>Activity will appear after customers verify issued codes.</p></div> : <section className="manufacturer-panel manufacturer-activity-panel"><div className="manufacturer-panel-heading"><div><span className="manufacturer-eyebrow">BY BATCH</span><h2>Verification activity</h2></div></div><div className="manufacturer-activity-chart-list">{rows.map((item) => <article key={item.batchId}><div className="manufacturer-activity-copy"><span><strong>{item.productName}</strong><small>{item.batchCode}</small></span><span><strong>{formatNumber(item.totalScans)}</strong><small>scans</small></span></div><div className="manufacturer-activity-bar"><i style={{ width: `${Math.max(12, (item.totalScans / maxScans) * 100)}%` }} /></div><div className="manufacturer-activity-footer"><span className={`manufacturer-reuse-state ${item.reuseSignals ? "warning" : "clear"}`}>{item.reuseSignals ? <><Icon name="warning" size={14} /> {item.reuseSignals} possible reuse signals</> : <><Icon name="check" size={14} /> No unusual activity detected</>}</span><small>{formatNumber(item.genuineScans)} genuine</small></div></article>)}</div></section>}</div>;
}
