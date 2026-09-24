import { useEffect, useState } from "react";
import Icon from "../../components/Icon";
import { downloadBatchExport, generateCodes, getBatches } from "../../services/manufacturerApi";

const formatNumber = (value) => new Intl.NumberFormat("en-NG").format(value || 0);
const dateLabel = (value) => value ? new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : "-";

export default function GenerateCodesPage() {
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState("");
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try { const next = await getBatches(); setBatches(next); setBatchId((current) => current || next.find((item) => item.status !== "generated")?.id || next[0]?.id || ""); }
    catch (problem) { setError(problem.message || "Could not load batches."); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const batch = batches.find((item) => item.id === batchId);
  async function generate() {
    if (!batch) return;
    setBusy(true); setError("");
    try { await generateCodes(batch.id); setGenerated(true); await load(); }
    catch (problem) { setError(problem.message || "Could not generate codes."); }
    finally { setBusy(false); }
  }
  async function exportBatch(format) {
    if (!batch) return;
    setExporting(format); setError("");
    try { await downloadBatchExport(batch.id, format); }
    catch (problem) { setError(problem.message || "Could not download export."); }
    finally { setExporting(""); }
  }

  return <div className="manufacturer-page manufacturer-generate-page"><section className="manufacturer-page-intro compact"><div><span className="manufacturer-eyebrow">CODE ISSUANCE</span><h1>Generate GenuineNG codes</h1><p>Create one unique, signed GenuineNG identity for every physical unit in a production batch.</p></div></section>{error && <div className="inline-notice" role="alert"><Icon name="info" size={18} /><p>{error}</p></div>}{loading ? <div className="empty-state"><p>Loading batches...</p></div> : !batch ? <div className="empty-state"><h2>No batches available</h2><p>Create a production batch before generating codes.</p></div> : <div className="manufacturer-generate-grid"><section className="manufacturer-panel manufacturer-generate-form"><span className="manufacturer-eyebrow">BATCH SELECTION</span><h2>Choose a production batch</h2><label>Batch<select value={batchId} onChange={(event) => { setBatchId(event.target.value); setGenerated(false); }}>{batches.map((item) => <option value={item.id} key={item.id}>{item.productName} — {item.batchCode}</option>)}</select></label><div className="manufacturer-generate-summary"><div><small>Product</small><strong>{batch.productName}</strong></div><div><small>Batch</small><strong>{batch.batchCode}</strong></div><div><small>Units</small><strong>{formatNumber(batch.unitsProduced)}</strong></div><div><small>Expiry</small><strong>{dateLabel(batch.expiryDate)}</strong></div></div><div className="manufacturer-generation-note"><Icon name="shield" size={20} /><p><strong>{formatNumber(batch.unitsProduced)} unique identities</strong> will be created and cryptographically signed for this batch. The private signing key remains on the GenuineNG server.</p></div>{batch.status === "generated" || generated ? <div className="manufacturer-generation-complete"><span><Icon name="check" size={20} /></span><div><strong>Codes generated</strong><small>{formatNumber(batch.codesGenerated || batch.unitsProduced)} complete</small></div></div> : <button type="button" className="manufacturer-lime-button full" onClick={generate} disabled={busy}><Icon name="qr" size={18} /> {busy ? "Generating..." : `Generate ${formatNumber(batch.unitsProduced)} codes`}</button>}</section><aside className="manufacturer-panel manufacturer-export-panel"><span className="manufacturer-eyebrow">EXPORT</span><h2>Production files</h2><p>Download files for packaging and production after codes are generated.</p>{[["CSV data", "Structured unit IDs and signed payloads", "file", "csv"], ["QR ZIP", "Individual QR artwork for every unit", "qr", "qr-zip"], ["Print manifest", "Batch-level production reference", "document", "manifest"]].map(([title, copy, icon, format]) => <button type="button" className="manufacturer-export-row" key={format} disabled={batch.status !== "generated" && !generated || Boolean(exporting)} onClick={() => exportBatch(format)}><span><Icon name={icon} size={18} /></span><span><strong>{title}</strong><small>{copy}</small></span><Icon name="download" size={17} />{exporting === format && <small>Preparing...</small>}</button>)}</aside></div>}</div>;
}
