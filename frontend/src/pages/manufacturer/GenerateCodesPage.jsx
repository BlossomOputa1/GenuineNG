import { useEffect, useMemo, useState } from 'react';
import Icon from '../../components/Icon';
import {
  downloadBatchExport,
  generateCodes,
  getBatches,
  getBillingConfig,
  getTokenAccount,
} from '../../services/manufacturerApi';

const formatNumber = (value) =>
  new Intl.NumberFormat("en-NG").format(value || 0);
const dateLabel = (value) =>
  value
    ? new Intl.DateTimeFormat("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "-";
export default function GenerateCodesPage({ navigate }) {
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState("");
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState('');
  const [error, setError] = useState('');
  const [billing, setBilling] = useState(null);
  const [tokenAccount, setTokenAccount] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [next, config] = await Promise.all([getBatches(), getBillingConfig()]);
      setBilling(config);
      if (config.enabled) setTokenAccount(await getTokenAccount());
      setBatches(next);
      setBatchId(
        (current) =>
          current ||
          next.find((item) => item.status !== "generated")?.id ||
          next[0]?.id ||
          "",
      );
    } catch (problem) {
      setError(problem.message || "Could not load batches.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);


  const batch = useMemo(
    () => batches.find((item) => item.id === batchId),
    [batches, batchId],
  );
  const generatedCount = progress?.generated ?? batch?.codesGenerated ?? 0;
  const total = progress?.total ?? batch?.unitsProduced ?? 0;
  const percent = total ? Math.floor((generatedCount / total) * 100) : 0;
  const complete = Boolean(
    progress?.complete || (batch && batch.status === "generated"),
  );

  async function generate() {
    if (!batch) return;
    setBusy(true);
    setError('');
    try {
      const finalStatus = await generateCodes(batch.id, setProgress);
      setProgress(finalStatus);
      await load();
    } catch (problem) {
      setError(problem.message || 'Code generation paused. You can safely resume.');
    } finally {
      setBusy(false);
    }
  }


  async function exportBatch(format) {
    if (!batch || !complete) return;
    setExporting(format);
    setError('');
    try {
      await downloadBatchExport(batch.id, format);
    } catch (problem) {
      setError(problem.message || 'Could not download export.');
    } finally {
      setExporting('');
    }
  }

  return (
    <div className="manufacturer-page manufacturer-generate-page">
      <section className="manufacturer-page-intro compact">
        <div>
          <span className="manufacturer-eyebrow">CODE ISSUANCE</span>
          <h1>Generate GenuineNG codes</h1>
          <p>
            Issue a signed code for each unit in a batch.
          </p>
        </div>
      </section>

      {billing?.enabled && <div className="manufacturer-token-hint">
        <span><strong>{formatNumber(tokenAccount?.balance)} tokens left</strong> · One token per QR code</span>
        <button type="button" onClick={() => navigate('/manufacturer/payments')}>Buy tokens <Icon name="arrow" size={15} /></button>
      </div>}

      {error && (
        <div className="inline-notice" role="alert">
          <Icon name="info" size={18} />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="empty-state">
          <p>Loading batches...</p>
        </div>
      ) : !batch ? (
        <div className="empty-state">
          <h2>No batches available</h2>
          <p>Create a production batch before generating codes.</p>
        </div>
      ) : (
        <div className="manufacturer-generate-grid">
          <section className="manufacturer-panel manufacturer-generate-form">
            <span className="manufacturer-eyebrow">BATCH SELECTION</span>
            <h2>Choose a production batch</h2>
            <label>
              Batch
              <select
                value={batchId}
                onChange={(event) => {
                  setBatchId(event.target.value);
                  setProgress(null);
                }}
              >
                {batches.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.productName} — {item.batchCode}
                  </option>
                ))}
              </select>
            </label>

            <div className="manufacturer-generate-summary">
              <div>
                <small>Product</small>
                <strong>{batch.productName}</strong>
              </div>
              <div>
                <small>Batch</small>
                <strong>{batch.batchCode}</strong>
              </div>
              <div>
                <small>Units</small>
                <strong>{formatNumber(batch.unitsProduced)}</strong>
              </div>
              <div>
                <small>Expiry</small>
                <strong>{dateLabel(batch.expiryDate)}</strong>
              </div>
            </div>

            <div className="manufacturer-real-progress" role="status" aria-live="polite">
              <div>
                <strong>
                  {formatNumber(generatedCount)} / {formatNumber(total)}
                </strong>
                <span>{percent}%</span>
              </div>
              <progress max="100" value={percent} />
              <small>
                {complete
                  ? 'Generation complete — exports are ready.'
                  : busy
                    ? 'Generating and saving the next chunk…'
                    : generatedCount
                      ? 'Partially generated — resume when ready.'
                      : 'Not started.'}
              </small>
            </div>

            {complete ? (
              <div className="manufacturer-generation-complete">
                <span>
                  <Icon name="check" size={20} />
                </span>
                <div>
                  <strong>Codes generated</strong>
                  <small>{formatNumber(generatedCount)} export-ready units</small>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="manufacturer-lime-button full"
                onClick={generate}
                disabled={busy}
              >
                <Icon name="qr" size={18} />{' '}
                {busy
                  ? `Generating ${formatNumber(generatedCount)} / ${formatNumber(total)}…`
                  : generatedCount
                    ? 'Resume generation'
                    : `Generate ${formatNumber(total)} codes`}
              </button>
            )}
          </section>

          <aside className="manufacturer-panel manufacturer-export-panel">
            <span className="manufacturer-eyebrow">EXPORT</span>
            <h2>Production files</h2>
            <p>Exports unlock only when every unit in the batch exists.</p>
            {[
              ['CSV data', 'Printer/production unit data', 'file', 'csv'],
              ['QR ZIP', 'Individual QR artwork for every unit', 'qr', 'qr-zip'],
              ['Print manifest', 'Batch/audit production record', 'document', 'manifest'],
            ].map(([title, copy, icon, format]) => (
              <button
                type="button"
                className="manufacturer-export-row"
                key={format}
                disabled={!complete || Boolean(exporting)}
                onClick={() => exportBatch(format)}
              >
                <span>
                  <Icon name={icon} size={18} />
                </span>
                <span>
                  <strong>{title}</strong>
                  <small>{copy}</small>
                </span>
                <Icon name="download" size={17} />
                {exporting === format && <small>Preparing...</small>}
              </button>
            ))}
          </aside>
        </div>
      )}


    </div>
  );
}
