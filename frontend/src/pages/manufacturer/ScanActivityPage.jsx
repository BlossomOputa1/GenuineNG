import { useEffect, useState } from 'react';
import Icon from '../../components/Icon';
import { getScanActivity } from '../../services/manufacturerApi';
const formatNumber = (value) => new Intl.NumberFormat('en-NG').format(value || 0);

export default function ScanActivityPage() {
  const [activity, setActivity] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { getScanActivity().then(setActivity).catch((problem) => setError(problem.message || 'Could not load scan activity.')); }, []);
  if (error) return <div className="manufacturer-page"><div className="inline-notice" role="alert"><Icon name="info" size={18} /><p>{error}</p></div></div>;
  if (!activity) return <div className="manufacturer-page"><div className="empty-state"><p>Loading scan activity...</p></div></div>;
  const rows = activity.batches || [];
  const maxScans = Math.max(1, ...rows.map((item) => item.totalScans));
  return <div className="manufacturer-page">
    <section className="manufacturer-page-intro compact"><div><span className="manufacturer-eyebrow">VERIFICATION</span><h1>Scan activity</h1><p>Public and manufacturer verification events, reuse activity and per-unit revocation across issued batches.</p></div></section>
    <section className="manufacturer-mini-stat-grid"><article><small>Total scans</small><strong>{formatNumber(activity.totalScans)}</strong><span>All verification events</span></article><article><small>Public scans</small><strong>{formatNumber(activity.totalPublicScans)}</strong><span>Counts toward anti-reuse</span></article><article><small>Revoked units</small><strong>{formatNumber(activity.revokedUnits)}</strong><span>Unit-specific deactivations</span></article></section>
    {!rows.length ? <div className="empty-state"><h2>No scan activity yet</h2><p>Activity will appear after issued codes are verified.</p></div> : <section className="manufacturer-panel manufacturer-activity-panel"><div className="manufacturer-panel-heading"><div><span className="manufacturer-eyebrow">BY BATCH</span><h2>Verification activity</h2></div></div><div className="manufacturer-activity-chart-list">{rows.map((item) => <article key={item.batchId}><div className="manufacturer-activity-copy"><span><strong>{item.productName}</strong><small>{item.batchCode}</small></span><span><strong>{formatNumber(item.totalScans)}</strong><small>scans</small></span></div><div className="manufacturer-activity-bar"><i style={{ width: `${Math.max(12, (item.totalScans / maxScans) * 100)}%` }} /></div><div className="manufacturer-activity-footer"><span className={`manufacturer-reuse-state ${item.reuseSignals ? 'warning' : 'clear'}`}>{item.reuseSignals ? <><Icon name="warning" size={14} /> {formatNumber(item.reuseSignals)} reuse events</> : <><Icon name="check" size={14} /> No reuse events yet</>}</span><small>{formatNumber(item.publicScans)} public · {formatNumber(item.manufacturerScans)} manufacturer · {formatNumber(item.revokedUnits)} revoked units</small></div></article>)}</div></section>}
  </div>;
}
