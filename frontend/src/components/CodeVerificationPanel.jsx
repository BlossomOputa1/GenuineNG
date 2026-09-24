import { useState } from "react";
import Icon from "./Icon";
import { verifyCode } from "../services/api";

const emptyPayload = { productId: "", batchId: "", unitId: "", unitIndex: "", keyVersion: "" };

export default function CodeVerificationPanel() {
  const [payload, setPayload] = useState(emptyPayload);
  const [signature, setSignature] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError(""); setResult(null);
    try {
      const response = await verifyCode({ payload: { ...payload, unitIndex: Number(payload.unitIndex), keyVersion: Number(payload.keyVersion) }, signature: signature.trim() });
      setResult(response);
    } catch (problem) { setError(problem.message || "Could not verify this code."); }
    finally { setBusy(false); }
  }

  function update(field, value) { setPayload((current) => ({ ...current, [field]: value })); }

  return <section className="scan-help-card code-verification-panel" aria-labelledby="code-verification-title"><div className="honesty-heading"><Icon name="qr" size={18} /><h2 id="code-verification-title">Verify a GenuineNG code</h2></div><p>Enter the signed code details from a product QR label to check its authenticity.</p><form onSubmit={submit} className="manufacturer-form-grid"><label>Product ID<input required value={payload.productId} onChange={(event) => update("productId", event.target.value)} /></label><label>Batch ID<input required value={payload.batchId} onChange={(event) => update("batchId", event.target.value)} /></label><label>Unit ID<input required value={payload.unitId} onChange={(event) => update("unitId", event.target.value)} /></label><label>Unit index<input required type="number" value={payload.unitIndex} onChange={(event) => update("unitIndex", event.target.value)} /></label><label>Key version<input required type="number" value={payload.keyVersion} onChange={(event) => update("keyVersion", event.target.value)} /></label><label className="wide">Signature<input required value={signature} onChange={(event) => setSignature(event.target.value)} /></label><button type="submit" className="button primary" disabled={busy}>{busy ? "Checking..." : "Verify code"} <Icon name="arrow" size={15} /></button></form>{error && <div className="inline-notice" role="alert"><Icon name="info" size={17} /><p>{error}</p></div>}{result && <div className={`inline-notice ${result.verdict === "genuine" ? "success" : "warning"}`} role="status"><Icon name={result.verdict === "genuine" ? "check" : "warning"} size={17} /><div><strong>{result.verdict === "genuine" ? "GenuineNG code verified" : "Code could not be verified"}</strong><p>{result.reason}</p>{result.reuseCheck && <small>Reuse status: {result.reuseCheck}</small>}</div></div>}</section>;
}
