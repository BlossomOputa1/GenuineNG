import { useEffect, useState } from "react";
import Icon from "../../components/Icon";
import { createBatch, getBatches, getProducts } from "../../services/manufacturerApi";

const formatNumber = (value) => new Intl.NumberFormat("en-NG").format(value || 0);
const dateLabel = (value) => value ? new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : "-";

export default function ManufacturerBatchesPage({ navigate }) {
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ productId: "", batchCode: "", manufacturedDate: "", expiryDate: "", unitsProduced: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try { const [nextBatches, nextProducts] = await Promise.all([getBatches(), getProducts()]); setBatches(nextBatches); setProducts(nextProducts); setForm((current) => ({ ...current, productId: current.productId || nextProducts[0]?.id || "" })); }
    catch (problem) { setError(problem.message || "Could not load production data."); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try { await createBatch({ ...form, unitsProduced: Number(form.unitsProduced) }); setDialogOpen(false); setForm({ productId: products[0]?.id || "", batchCode: "", manufacturedDate: "", expiryDate: "", unitsProduced: "" }); await load(); }
    catch (problem) { setError(problem.message || "Could not create batch."); }
    finally { setBusy(false); }
  }

  return <div className="manufacturer-page"><section className="manufacturer-page-intro compact"><div><span className="manufacturer-eyebrow">PRODUCTION</span><h1>Batches</h1><p>Create and manage production batches under registered products.</p></div><button className="manufacturer-lime-button" type="button" onClick={() => setDialogOpen(true)} disabled={!products.length}><Icon name="plus" size={17} /> Create batch</button></section>{error && <div className="inline-notice" role="alert"><Icon name="info" size={18} /><p>{error}</p></div>}{loading ? <div className="empty-state"><p>Loading batches...</p></div> : !batches.length ? <div className="empty-state"><h2>No batches yet</h2><p>Create a batch after registering a product.</p></div> : <section className="manufacturer-panel manufacturer-table-panel"><div className="manufacturer-table-head"><span>Product / batch</span><span>Manufactured</span><span>Expiry</span><span>Units</span><span>Code status</span><span /></div>{batches.map((batch) => <article className="manufacturer-table-row" key={batch.id}><div className="manufacturer-table-product"><span className="manufacturer-list-icon"><Icon name="layers" size={17} /></span><span><strong>{batch.productName}</strong><small>{batch.batchCode}</small></span></div><span>{dateLabel(batch.manufacturedDate)}</span><span>{dateLabel(batch.expiryDate)}</span><strong>{formatNumber(batch.unitsProduced)}</strong><span className={`manufacturer-status-chip ${batch.status}`}>{batch.status === "generated" ? `${formatNumber(batch.codesGenerated)} generated` : batch.status === "partial" ? `${formatNumber(batch.codesGenerated)} / ${formatNumber(batch.unitsProduced)} generated` : "Ready to generate"}</span><button type="button" className="manufacturer-row-action" onClick={() => navigate(batch.status === "generated" ? "/manufacturer/batches" : "/manufacturer/generate-codes")}><Icon name="arrow" size={15} /></button></article>)}</section>}{dialogOpen && <div className="manufacturer-dialog-backdrop" role="presentation" onMouseDown={() => !busy && setDialogOpen(false)}><form className="manufacturer-dialog" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="create-batch-title" onMouseDown={(event) => event.stopPropagation()}><button type="button" className="manufacturer-dialog-close" onClick={() => setDialogOpen(false)} aria-label="Close"><Icon name="close" size={18} /></button><span className="manufacturer-eyebrow">NEW BATCH</span><h2 id="create-batch-title">Create production batch</h2><p>Each batch belongs to one permanent product record.</p><div className="manufacturer-form-grid"><label className="wide">Product<select required value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })}>{products.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}</select></label><label>Batch code<input required value={form.batchCode} onChange={(event) => setForm({ ...form, batchCode: event.target.value })} placeholder="e.g. EMZ-260921-A" /></label><label>Units produced<input required min="1" max="100000" type="number" value={form.unitsProduced} onChange={(event) => setForm({ ...form, unitsProduced: event.target.value })} placeholder="50000" /></label><label>Manufactured date<input required type="date" value={form.manufacturedDate} onChange={(event) => setForm({ ...form, manufacturedDate: event.target.value })} /></label><label>Expiry date<input required type="date" value={form.expiryDate} onChange={(event) => setForm({ ...form, expiryDate: event.target.value })} /></label></div><div className="manufacturer-dialog-actions"><button type="button" className="manufacturer-secondary-button" onClick={() => setDialogOpen(false)}>Cancel</button><button type="submit" className="manufacturer-lime-button" disabled={busy}>{busy ? "Creating..." : "Create batch"}</button></div></form></div>}</div>;
}
