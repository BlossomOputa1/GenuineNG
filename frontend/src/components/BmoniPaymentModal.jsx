import React, { useState, useEffect } from 'react';

export default function BmoniPaymentModal({
  isOpen,
  onClose,
  loading,
  error,
  vbaDetails,
  settled,
  onManualVerify,
}) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes
  const [verifying, setVerifying] = useState(false);
  const [verifyNotice, setVerifyNotice] = useState('');

  // 15-minute countdown timer
  useEffect(() => {
    if (!isOpen || settled || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, settled, timeLeft]);

  // Reset timer whenever a new VBA is opened
  useEffect(() => {
    if (isOpen) {
      setTimeLeft(15 * 60);
      setVerifying(false);
      setVerifyNotice('');
    }
  }, [isOpen, vbaDetails?.reference]);

  if (!isOpen) return null;

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualCheck = async () => {
    setVerifying(true);
    setVerifyNotice('Checking BMoni settlement rail...');
    if (onManualVerify) {
      await onManualVerify();
    }
    // Leave verifying indicator running briefly to allow webhook/realtime to catch
    setTimeout(() => {
      setVerifying(false);
      if (!settled) {
        setVerifyNotice('Transfer not detected yet. Settlement usually takes 10 to 45 seconds.');
      }
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-emerald-900/60 bg-[#0c1f17] p-6 text-white shadow-2xl">
        {/* Close Button */}
        {!settled && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-emerald-400 hover:text-white text-lg font-bold"
            aria-label="Close"
          >
            ✕
          </button>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                settled ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
              }`}
            />
            <h3 className="text-lg font-bold">
              {settled ? 'Payment Settled!' : 'Fund Batch with BMoni'}
            </h3>
          </div>
          {!settled && (
            <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-emerald-950 border border-emerald-800 text-emerald-300">
              Window: {formatTimer(timeLeft)}
            </span>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="py-10 text-center text-sm text-emerald-300/80">
            <div className="w-8 h-8 mx-auto mb-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <p>Generating dedicated Virtual Bank Account rail…</p>
          </div>
        )}

        {/* Error notice */}
        {error && !loading && (
          <div className="p-3 mb-4 rounded-lg bg-rose-950/60 border border-rose-800/40 text-xs text-rose-200">
            {error}
          </div>
        )}

        {/* Settled state */}
        {settled && (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl font-bold">
              ✓
            </div>
            <h4 className="text-base font-semibold text-emerald-200">Invoice Confirmed</h4>
            <p className="text-xs text-emerald-400/80">
              Transfer verified on BMoni rails. Resuming cryptographic code generation…
            </p>
          </div>
        )}

        {/* Active Transfer Details */}
        {!loading && !settled && (
          <div>
            <p className="text-xs text-emerald-300/80 mb-3">
              Transfer the batch issuance fee using your <strong>BMoni App</strong> or direct bank transfer into the dedicated settlement account below.
            </p>

            {/* Account Box */}
            <div className="space-y-2.5 rounded-xl border border-emerald-800/60 bg-[#07150f] p-4 text-sm font-mono mb-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-emerald-400/70 font-sans">Bank:</span>
                <span className="text-white font-bold">{vbaDetails?.bankName || 'Wema Bank'}</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-emerald-400/70 font-sans">Account Name:</span>
                <span className="text-white truncate max-w-[240px]">
                  {vbaDetails?.accountName || 'GenuineNG / Manufacturer'}
                </span>
              </div>

              <div className="flex justify-between items-center border-t border-emerald-900/60 pt-2">
                <span className="text-emerald-400/70 font-sans">Account Number:</span>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold tracking-wider text-emerald-300">
                    {vbaDetails?.accountNumber || '7820194821'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(vbaDetails?.accountNumber || '7820194821')}
                    className="text-xs px-2 py-0.5 rounded bg-emerald-900/80 text-emerald-200 hover:bg-emerald-700"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-emerald-900/60 pt-2">
                <span className="text-emerald-400/70 font-sans">Amount to Fund:</span>
                <span className="text-base font-bold text-white">
                  ₦{Number(vbaDetails?.amount || 5000).toLocaleString()} NGN
                </span>
              </div>

              <div className="flex justify-between items-center border-t border-emerald-900/60 pt-2 text-[11px]">
                <span className="text-emerald-500/60 font-sans">Reference:</span>
                <span className="text-emerald-400/60 truncate max-w-[200px]">
                  {vbaDetails?.reference || '-'}
                </span>
              </div>
            </div>

            {/* BMoni App Download CTA */}
            <div className="mb-4 p-3 rounded-xl bg-black/40 border border-emerald-900/40 text-xs">
              <span className="text-emerald-300/80 font-semibold block mb-1.5">
                Need the BMoni App?
              </span>
              <div className="flex gap-2">
                <a
                  href="https://play.google.com/store/apps"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 text-center py-1.5 px-3 rounded bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 text-[11px] hover:bg-emerald-900 transition"
                >
                  Google Play Store ↗
                </a>
                <a
                  href="https://apps.apple.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 text-center py-1.5 px-3 rounded bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 text-[11px] hover:bg-emerald-900 transition"
                >
                  Apple App Store ↗
                </a>
              </div>
            </div>

            {verifyNotice && (
              <div className="p-2.5 mb-3 rounded-lg bg-emerald-950/80 border border-emerald-800/40 text-xs text-emerald-200 text-center">
                {verifyNotice}
              </div>
            )}

            {/* "I have sent the money" Action */}
            <button
              type="button"
              onClick={handleManualCheck}
              disabled={verifying || timeLeft === 0}
              className="w-full py-3 rounded-lg bg-emerald-500 font-bold text-black text-sm hover:bg-emerald-400 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {verifying ? (
                <>
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Verifying Transfer…
                </>
              ) : (
                'I have sent the money'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}