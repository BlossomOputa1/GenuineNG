import { useState } from "react";
import Icon from "../../components/Icon";
import { manufacturerBatches, manufacturerProducts } from "../../data/manufacturerDemo";

const formatNumber = (value) => new Intl.NumberFormat("en-NG").format(value);

export default function ManufacturerBatchesPage({ navigate }) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="manufacturer-page">
      <section className="manufacturer-page-intro compact">
        <div>
          <span className="manufacturer-eyebrow">PRODUCTION</span>
          <h1>Batches</h1>
          <p>Create and manage production batches under registered products.</p>
        </div>
        <button className="manufacturer-lime-button" type="button" onClick={() => setDialogOpen(true)}><Icon name="plus" size={17} /> Create batch</button>
      </section>

      <section className="manufacturer-panel manufacturer-table-panel">
        <div className="manufacturer-table-head">
          <span>Product / batch</span><span>Manufactured</span><span>Expiry</span><span>Units</span><span>Code status</span><span />
        </div>
        {manufacturerBatches.map((batch) => (
          <article className="manufacturer-table-row" key={batch.id}>
            <div className="manufacturer-table-product"><span className="manufacturer-list-icon"><Icon name="layers" size={17} /></span><span><strong>{batch.productName}</strong><small>{batch.batchCode}</small></span></div>
            <span>{batch.manufacturedDate}</span>
            <span>{batch.expiryDate}</span>
            <strong>{formatNumber(batch.unitsProduced)}</strong>
            <span className={`manufacturer-status-chip ${batch.status}`}>{batch.status === "generated" ? `${formatNumber(batch.codesGenerated)} generated` : "Ready to generate"}</span>
            <button type="button" className="manufacturer-row-action" onClick={() => navigate(batch.status === "ready" ? "/manufacturer/generate-codes" : "/manufacturer/batches")}><Icon name="arrow" size={15} /></button>
          </article>
        ))}
      </section>

      {dialogOpen && (
        <div className="manufacturer-dialog-backdrop" role="presentation" onMouseDown={() => setDialogOpen(false)}>
          <section className="manufacturer-dialog" role="dialog" aria-modal="true" aria-labelledby="create-batch-title" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="manufacturer-dialog-close" onClick={() => setDialogOpen(false)} aria-label="Close"><Icon name="close" size={18} /></button>
            <span className="manufacturer-eyebrow">NEW BATCH</span>
            <h2 id="create-batch-title">Create production batch</h2>
            <p>Each batch belongs to one permanent product record.</p>
            <div className="manufacturer-form-grid">
              <label className="wide">Product<select defaultValue=""><option value="" disabled>Select product</option>{manufacturerProducts.map((product) => <option key={product.id}>{product.name}</option>)}</select></label>
              <label>Batch code<input placeholder="e.g. EMZ-260921-A" /></label>
              <label>Units produced<input type="number" placeholder="50000" /></label>
              <label>Manufactured date<input type="date" /></label>
              <label>Expiry date<input type="date" /></label>
            </div>
            <div className="manufacturer-dialog-actions">
              <button type="button" className="manufacturer-secondary-button" onClick={() => setDialogOpen(false)}>Cancel</button>
              <button type="button" className="manufacturer-lime-button" onClick={() => setDialogOpen(false)}>Create batch</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
