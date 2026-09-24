import { useEffect, useState } from "react";
import Icon from "../../components/Icon";
import { getProducts, registerProduct } from "../../services/manufacturerApi";

const formatNumber = (value) => new Intl.NumberFormat("en-NG").format(value || 0);

export default function ManufacturerProductsPage() {
  const [products, setProducts] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", nafdacNumber: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try { setProducts(await getProducts()); }
    catch (problem) { setError(problem.message || "Could not load products."); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await registerProduct(form);
      setForm({ name: "", category: "", nafdacNumber: "" });
      setDialogOpen(false);
      await load();
    } catch (problem) { setError(problem.message || "Could not register product."); }
    finally { setBusy(false); }
  }

  return (
    <div className="manufacturer-page">
      <section className="manufacturer-page-intro compact"><div><span className="manufacturer-eyebrow">CATALOGUE</span><h1>Products</h1><p>Permanent product records registered under this manufacturer account.</p></div><button className="manufacturer-lime-button" type="button" onClick={() => setDialogOpen(true)}><Icon name="plus" size={17} /> Register product</button></section>
      {error && <div className="inline-notice" role="alert"><Icon name="info" size={18} /><p>{error}</p></div>}
      {loading ? <div className="empty-state"><p>Loading products...</p></div> : products.length === 0 ? <div className="empty-state"><h2>No products registered</h2><p>Register the first product for this manufacturer account.</p></div> : <section className="manufacturer-product-grid">{products.map((product) => <article className="manufacturer-product-card" key={product.id}><div className="manufacturer-product-topline"><span className="manufacturer-product-icon"><Icon name="package" size={20} /></span><span className="manufacturer-status-chip generated">Registered</span></div><span className="manufacturer-eyebrow">{product.category}</span><h2>{product.name}</h2><div className="manufacturer-data-pairs"><div><small>NAFDAC</small><strong>{product.nafdacNumber || "Not provided"}</strong></div><div><small>Batches</small><strong>{product.batchCount || 0}</strong></div><div><small>Codes issued</small><strong>{formatNumber(product.codesIssued)}</strong></div><div><small>Scans</small><strong>{formatNumber(product.scans || product.scanCount)}</strong></div></div></article>)}</section>}
      {dialogOpen && <div className="manufacturer-dialog-backdrop" role="presentation" onMouseDown={() => !busy && setDialogOpen(false)}><form className="manufacturer-dialog" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="register-product-title" onMouseDown={(event) => event.stopPropagation()}><button type="button" className="manufacturer-dialog-close" onClick={() => setDialogOpen(false)} aria-label="Close"><Icon name="close" size={18} /></button><span className="manufacturer-eyebrow">NEW PRODUCT</span><h2 id="register-product-title">Register a product</h2><p>Create the permanent product record once, then reuse it across production batches.</p><div className="manufacturer-form-grid"><label>Product name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Paracetamol 500mg" /></label><label>Category<select required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option value="" disabled>Select category</option><option>Drug</option><option>Food</option><option>Supplement</option><option>Cosmetic</option></select></label><label className="wide">NAFDAC registration number<input value={form.nafdacNumber} onChange={(event) => setForm({ ...form, nafdacNumber: event.target.value })} placeholder="e.g. A4-1234" /></label></div><div className="manufacturer-dialog-actions"><button type="button" className="manufacturer-secondary-button" onClick={() => setDialogOpen(false)}>Cancel</button><button type="submit" className="manufacturer-lime-button" disabled={busy}>{busy ? "Registering..." : "Register product"}</button></div></form></div>}
    </div>
  );
}
