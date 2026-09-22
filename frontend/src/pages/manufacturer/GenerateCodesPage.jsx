import { useMemo, useState } from "react";
import Icon from "../../components/Icon";
import { manufacturerBatches } from "../../data/manufacturerDemo";

const formatNumber = (value) => new Intl.NumberFormat("en-NG").format(value);

export default function GenerateCodesPage() {
  const readyBatches = useMemo(() => manufacturerBatches.filter((batch) => batch.status === "ready"), []);
  const [batchId, setBatchId] = useState(readyBatches[0]?.id || manufacturerBatches[0]?.id);
  const [generated, setGenerated] = useState(false);
  const batch = manufacturerBatches.find((item) => item.id === batchId) || manufacturerBatches[0];

  function generate() {
    setGenerated(true);
  }

  return (
    <div className="manufacturer-page manufacturer-generate-page">
      <section className="manufacturer-page-intro compact">
        <div>
          <span className="manufacturer-eyebrow">CODE ISSUANCE</span>
          <h1>Generate GenuineNG codes</h1>
          <p>Create one unique, signed GenuineNG identity for every physical unit in a production batch.</p>
        </div>
      </section>

      <div className="manufacturer-generate-grid">
        <section className="manufacturer-panel manufacturer-generate-form">
          <span className="manufacturer-eyebrow">BATCH SELECTION</span>
          <h2>Choose a production batch</h2>
          <label>Batch<select value={batchId} onChange={(event) => { setBatchId(event.target.value); setGenerated(false); }}>{manufacturerBatches.map((item) => <option value={item.id} key={item.id}>{item.productName} — {item.batchCode}</option>)}</select></label>

          <div className="manufacturer-generate-summary">
            <div><small>Product</small><strong>{batch.productName}</strong></div>
            <div><small>Batch</small><strong>{batch.batchCode}</strong></div>
            <div><small>Units</small><strong>{formatNumber(batch.unitsProduced)}</strong></div>
            <div><small>Expiry</small><strong>{batch.expiryDate}</strong></div>
          </div>

          <div className="manufacturer-generation-note">
            <Icon name="shield" size={20} />
            <p><strong>{formatNumber(batch.unitsProduced)} unique identities</strong> will be created and cryptographically signed for this batch. The private signing key remains on the GenuineNG server.</p>
          </div>

          {!generated ? (
            <button type="button" className="manufacturer-lime-button full" onClick={generate}><Icon name="qr" size={18} /> Generate {formatNumber(batch.unitsProduced)} codes</button>
          ) : (
            <div className="manufacturer-generation-complete">
              <span><Icon name="check" size={20} /></span>
              <div><strong>Codes generated</strong><small>{formatNumber(batch.unitsProduced)} / {formatNumber(batch.unitsProduced)} complete</small></div>
            </div>
          )}
        </section>

        <aside className="manufacturer-panel manufacturer-export-panel">
          <span className="manufacturer-eyebrow">EXPORT</span>
          <h2>Production files</h2>
          <p>{generated ? "Your demo export files are ready for the packaging workflow." : "Generate the batch codes before production files become available."}</p>
          {[['CSV data', 'Structured unit IDs and signed payloads', 'file'], ['QR ZIP', 'Individual QR artwork for every unit', 'qr'], ['Print manifest', 'Batch-level production reference', 'document']].map(([title, copy, icon]) => (
            <button type="button" className="manufacturer-export-row" key={title} disabled={!generated}>
              <span><Icon name={icon} size={18} /></span><span><strong>{title}</strong><small>{copy}</small></span><Icon name="download" size={17} />
            </button>
          ))}
        </aside>
      </div>
    </div>
  );
}
