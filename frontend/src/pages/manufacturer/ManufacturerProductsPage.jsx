import { useState } from "react";
import Icon from "../../components/Icon";
import { manufacturerProducts } from "../../data/manufacturerDemo";

const formatNumber = (value) => new Intl.NumberFormat("en-NG").format(value);

export default function ManufacturerProductsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="manufacturer-page">
      <section className="manufacturer-page-intro compact">
        <div>
          <span className="manufacturer-eyebrow">CATALOGUE</span>
          <h1>Products</h1>
          <p>Permanent product records registered under this manufacturer account.</p>
        </div>
        <button className="manufacturer-lime-button" type="button" onClick={() => setDialogOpen(true)}>
          <Icon name="plus" size={17} /> Register product
        </button>
      </section>

      <section className="manufacturer-product-grid">
        {manufacturerProducts.map((product) => (
          <article className="manufacturer-product-card" key={product.id}>
            <div className="manufacturer-product-topline">
              <span className="manufacturer-product-icon"><Icon name="package" size={20} /></span>
              <span className="manufacturer-status-chip generated">Registered</span>
            </div>
            <span className="manufacturer-eyebrow">{product.category}</span>
            <h2>{product.name}</h2>
            <div className="manufacturer-data-pairs">
              <div><small>NAFDAC</small><strong>{product.nafdacNumber}</strong></div>
              <div><small>Batches</small><strong>{product.batchCount}</strong></div>
              <div><small>Codes issued</small><strong>{formatNumber(product.codesIssued)}</strong></div>
              <div><small>Scans</small><strong>{formatNumber(product.scanCount)}</strong></div>
            </div>
            <button type="button" className="manufacturer-text-action">View product <Icon name="arrow" size={15} /></button>
          </article>
        ))}
      </section>

      {dialogOpen && (
        <div className="manufacturer-dialog-backdrop" role="presentation" onMouseDown={() => setDialogOpen(false)}>
          <section className="manufacturer-dialog" role="dialog" aria-modal="true" aria-labelledby="register-product-title" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="manufacturer-dialog-close" onClick={() => setDialogOpen(false)} aria-label="Close"><Icon name="close" size={18} /></button>
            <span className="manufacturer-eyebrow">NEW PRODUCT</span>
            <h2 id="register-product-title">Register a product</h2>
            <p>Create the permanent product record once, then reuse it across production batches.</p>
            <div className="manufacturer-form-grid">
              <label>Product name<input placeholder="e.g. Paracetamol 500mg" /></label>
              <label>Category<select defaultValue=""><option value="" disabled>Select category</option><option>Drug</option><option>Food</option><option>Supplement</option><option>Cosmetic</option></select></label>
              <label className="wide">NAFDAC registration number<input placeholder="e.g. A4-1234" /></label>
            </div>
            <div className="manufacturer-dialog-actions">
              <button type="button" className="manufacturer-secondary-button" onClick={() => setDialogOpen(false)}>Cancel</button>
              <button type="button" className="manufacturer-lime-button" onClick={() => setDialogOpen(false)}>Register product</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
