import { useEffect, useState } from 'react';
import Icon from '../../components/Icon';
import { getScanActivity } from '../../services/manufacturerApi';

const formatNumber = (value) => new Intl.NumberFormat('en-NG').format(value || 0);

export default function ScanActivityPage() {
  const [activity, setActivity] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    getScanActivity().then(setActivity)
      .catch((problem) => setError(problem.message || 'Could not load scan activity.'));
  }, []);
  if (error) return <div className="manufacturer-page"><div className="inline-notice" role="alert"><Icon name="info" size={18} /><p>{error}</p></div></div>;
  if (!activity) return <div className="manufacturer-page"><div className="empty-state"><p>Loading scan activity…</p></div></div>;
  const rows = activity.batches || [];
  return <div className="manufacturer-page">
    <section className="manufacturer-page-intro compact">
      <div><span className="manufacturer-eyebrow">VERIFICATION</span><h1>Scan activity</h1><p>Scan counts for your GenuineNG product codes.</p></div>
    </section>
    <section className="manufacturer-mini-stat-grid manufacturer-scan-overview">
      <article><small>Total scans</small><strong>{formatNumber(activity.totalScans)}</strong><span>All recorded code checks</span></article>
      <article><small>Batches tracked</small><strong>{formatNumber(rows.length)}</strong><span>Production batches</span></article>
    </section>
    <section className="manufacturer-panel manufacturer-scan-batches">
      <div className="manufacturer-panel-heading"><div><span className="manufacturer-eyebrow">BY BATCH</span><h2>Scans per batch</h2></div></div>
      {rows.length ? <div className="manufacturer-scan-card-grid">{rows.map((item) =>
        <article className="manufacturer-scan-batch-card" key={item.batchId}>
          <span className="manufacturer-list-icon"><Icon name="scan" size={20} /></span>
          <small>{item.batchCode}</small>
          <h3>{item.productName}</h3>
          <strong>{formatNumber(item.totalScans)}</strong>
          <span>scans</span>
        </article>
      )}</div> : <div className="empty-state"><h2>No batches yet</h2><p>Scan counts will appear here after codes are issued and checked.</p></div>}
    </section>
  </div>;
}
