import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import Icon from '../../components/Icon';
import { supabase } from '../../services/supabase';
import {
  downloadBatchExport,
  generateCodes,
  getBatches,
  requestBatchVba,
  ApiError,
} from '../../services/manufacturerApi';

const formatNumber = (value) => new Intl.NumberFormat('en-NG').format(value || 0);
const dateLabel = (value) =>
  value
    ? new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
    : '-';

// Dynamic pricing tier (e.g., ₦10 per signed unit code)
const UNIT_COST_NGN = 10;

export default function GenerateCodesPage() {
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState('');
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState('');
  const [error, setError] = useState('');

  // Payment Gate Modal States
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [vbaDetails, setVbaDetails] = useState(null);
  const [copied, setCopied] = useState(false);
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
      setBatchId((current) => current || next.find((item) => item.status !== 'generated')?.id || next[0]?.id || '');
    } catch (problem) {
      setError(problem.message || 'Could not load batches.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    return () => cleanupPaymentWatcher();
  }, [cleanupPaymentWatcher]);

  const batch = useMemo(() => batches.find((item) => item.id === batchId), [batches, batchId]);
  const generatedCount = progress?.generated ?? batch?.codesGenerated ?? 0;
  const total = progress?.total ?? batch?.unitsProduced ?? 0;
  const percent = total ? Math.floor((generatedCount / total) * 100) : 0;
  const complete = Boolean(progress?.complete || (batch && batch.status === 'generated'));

  const handleSettlementSuccess = useCallback(async () => {
    cleanupPaymentWatcher();
    setPaymentSettled(true);
    setTimeout(async () => {
      setPaymentModalOpen(false);
      setPaymentSettled(false);
      // Auto-resume generation after modal closes
      await generate();
    }, 1500);
  }, [cleanupPaymentWatcher]);

  // Set up Supabase Realtime & interval polling for invoice settlement
  useEffect(() => {
    if (!vbaDetails?.reference || !paymentModalOpen || paymentSettled) return;

    // 1. Supabase Realtime WebSocket
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

    // 2. HTTP Polling Fallback (every 4 seconds)
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

  async function generate() {
    if (!batch) return;
    setBusy(true);
    setError('');
    try {
      const finalStatus = await generateCodes(batch.id, setProgress);
      setProgress(finalStatus);
      await load();
    } catch (problem) {
      // 402 Gate Handler: intercept and trigger BMoni payment modal
      if (problem instanceof ApiError && (problem.status === 402 || problem.code === 'PAYMENT_REQUIRED')) {
        await initiateBatchPayment(batch);
      } else {
        setError(problem.message || 'Code generation paused. You can safely resume.');
      }
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

  const copyAccountNumber = (accNumber) => {
    if (!accNumber) return;
    navigator.clipboard.writeText(accNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

      {/* BMoni Layer 2 Payment Required Modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#12141a] border border-neutral-800 rounded-xl p-6 shadow-2xl text-neutral-100">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <div>
                <h3 className="text-lg font-semibold text-white">Batch Funding Required</h3>
                <p className="text-xs text-neutral-400 mt-0.5">Pay via NGN Instant Bank Transfer</p>
              </div>
              {!paymentSettled && (
                <button
                  type="button"
                  onClick={() => {
                    cleanupPaymentWatcher();
                    setPaymentModalOpen(false);
                  }}
                  className="text-neutral-500 hover:text-neutral-300 text-xl font-bold"
                >
                  &times;
                </button>
              )}
            </div>

            <div className="py-5">
              {paymentLoading && (
                <div className="flex flex-col items-center justify-center py-8 space-y-3">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-neutral-400">Requesting dynamic payment rails...</p>
                </div>
              )}

              {paymentSettled && (
                <div className="flex flex-col items-center justify-center py-8 space-y-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-500 flex items-center justify-center text-emerald-400 text-2xl">
                    ✓
                  </div>
                  <p className="text-base font-medium text-emerald-300">Payment Settled!</p>
                  <p className="text-xs text-neutral-400">Unlocking cryptographic signing now...</p>
                </div>
              )}

              {!paymentLoading && !paymentSettled && vbaDetails && (
                <div className="space-y-4">
                  <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3 text-sm">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-400">Bank Name</span>
                      <span className="font-semibold text-white">
                        {vbaDetails.bank_name || vbaDetails.bankName || 'Wema Bank'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-xs text-neutral-400">Account Number</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-base font-bold text-emerald-400">
                          {vbaDetails.account_number || vbaDetails.accountNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            copyAccountNumber(vbaDetails.account_number || vbaDetails.accountNumber)
                          }
                          className="px-2 py-0.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700"
                        >
                          {copied ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-400">Account Name</span>
                      <span className="text-neutral-200">
                        {vbaDetails.account_name || vbaDetails.accountName || 'GenuineNG / BMoni'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-neutral-800">
                      <span className="text-xs text-neutral-400">Amount Due</span>
                      <span className="font-mono text-sm font-semibold text-white">
                        ₦{formatNumber(vbaDetails.amount || 0)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center space-x-2 text-xs text-neutral-400 py-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                    </span>
                    <span>Waiting for bank transfer settlement...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-neutral-800 text-[11px] text-neutral-500 text-center">
              Settles automatically via BMoni webhook. Do not refresh.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}