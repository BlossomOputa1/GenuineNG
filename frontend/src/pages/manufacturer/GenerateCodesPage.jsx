import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import Icon from '../../components/Icon';
import BmoniPaymentModal from '../../components/BmoniPaymentModal';
import { supabase } from '../../services/supabase';
import {
  downloadBatchExport,
  generateCodes,
  getBatches,
  requestBatchVba,
  ApiError,
  sandboxSettleInvoice,
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
// const formatNumber = (value) => new Intl.NumberFormat('en-NG').format(value || 0);
// const dateLabel = (value) =>
//   value
//     ? new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
//     : '-';

const UNIT_COST_NGN = 10;

export default function GenerateCodesPage() {
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState("");
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState('');
  const [error, setError] = useState('');

  // Payment states
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [vbaDetails, setVbaDetails] = useState(null);
  const [paymentSettled, setPaymentSettled] = useState(false);

  const pollTimerRef = useRef(null);

  const cleanupPaymentWatcher = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const next = await getBatches();
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
    //   setBatchId((current) => current || next.find((item) => item.status !== 'generated')?.id || next[0]?.id || '');
    // } catch (problem) {
    //   setError(problem.message || 'Could not load batches.');
    // } finally {
    //   setLoading(false);
    // }
  }

  useEffect(() => {
    load();
    return () => cleanupPaymentWatcher();
  }, [cleanupPaymentWatcher]);

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

  const generate = useCallback(async () => {
    if (!batch) return;
    setBusy(true);
    setError('');
    try {
      const finalStatus = await generateCodes(batch.id, setProgress);
      setProgress(finalStatus);
      await load();
    } catch (problem) {
      if (problem instanceof ApiError && (problem.status === 402 || problem.code === 'PAYMENT_REQUIRED')) {
        await initiateBatchPayment(batch);
      } else {
        setError(problem.message || 'Code generation paused. You can safely resume.');
      }
    } finally {
      setBusy(false);
    }
  }, [batch]);

  const handleSettlementSuccess = useCallback(async () => {
    cleanupPaymentWatcher();
    setPaymentSettled(true);
    setTimeout(async () => {
      setPaymentModalOpen(false);
      setPaymentSettled(false);
      await generate();
    }, 1500);
  }, [cleanupPaymentWatcher, generate]);

  // Realtime & fallback polling for invoice status
  useEffect(() => {
    if (!vbaDetails?.reference || !paymentModalOpen || paymentSettled) return;

    const channel = supabase
      .channel(`inv-${vbaDetails.reference}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'invoices',
          filter: `reference=eq.${vbaDetails.reference}`,
        },
        (payload) => {
          if (payload.new?.status === 'settled') {
            handleSettlementSuccess();
          }
        }
      )
      .subscribe();

    pollTimerRef.current = setInterval(async () => {
      const { data } = await supabase
        .from('invoices')
        .select('status')
        .eq('reference', vbaDetails.reference)
        .maybeSingle();

      if (data?.status === 'settled') {
        handleSettlementSuccess();
      }
    }, 4000);

    return () => {
      supabase.removeChannel(channel);
      cleanupPaymentWatcher();
    };
  }, [vbaDetails?.reference, paymentModalOpen, paymentSettled, handleSettlementSuccess, cleanupPaymentWatcher]);

  async function initiateBatchPayment(targetBatch) {
    setPaymentModalOpen(true);
    setPaymentLoading(true);
    setError('');
    try {
      const amount = Math.max(5000, (targetBatch.unitsProduced || 0) * UNIT_COST_NGN);
      const vba = await requestBatchVba(targetBatch.id, amount);
      setVbaDetails(vba);
    } catch (err) {
      setError(err.message || 'Failed to generate payment details.');
      setPaymentModalOpen(false);
    } finally {
      setPaymentLoading(false);
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
            Create one unique signed identity for every physical unit. Generation is resumable and the progress below
            comes from stored unit rows, not a timer.
          </p>
        </div>
      </section>

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

            <div className="manufacturer-generation-note">
              <Icon name="shield" size={20} />
              <p>The Ed25519 private key remains backend-only. Reloading or retrying preserves codes that already exist.</p>
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

      {/* BMoni Modal */}
      <BmoniPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => {
          cleanupPaymentWatcher();
          setPaymentModalOpen(false);
        }}
        loading={paymentLoading}
        error={error}
        vbaDetails={vbaDetails}
        settled={paymentSettled}
        onManualVerify={async () => {
          if (!vbaDetails?.reference) return;
          try {
            // Instantly settle the test invoice in Supabase
            await sandboxSettleInvoice(vbaDetails.reference);
            // Trigger UI settlement check & code generation
            await handleSettlementSuccess();
          } catch (err) {
            setError(err.message || 'Settlement verification failed.');
          }
        }}
      />
    </div>
  );
}