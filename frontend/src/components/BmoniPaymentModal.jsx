import React, { useState } from 'react';

export default function BmoniPaymentModal({
    isOpen,
    onClose,
    loading,
    error,
    vbaDetails,
    settled,
}) {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const copyAccountNumber = (accNumber) => {
        if (!accNumber) return;
        navigator.clipboard.writeText(accNumber);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatNumber = (value) => new Intl.NumberFormat('en-NG').format(value || 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[#12141a] border border-neutral-800 rounded-xl p-6 shadow-2xl text-neutral-100">

                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
                    <div>
                        <h3 className="text-lg font-semibold text-white">Batch Funding Required</h3>
                        <p className="text-xs text-neutral-400 mt-0.5">Pay via NGN Instant Bank Transfer</p>
                    </div>
                    {!settled && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-neutral-500 hover:text-neutral-300 text-xl font-bold"
                        >
                            &times;
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className="py-5">
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-8 space-y-3">
                            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-neutral-400">Requesting dynamic payment rails...</p>
                        </div>
                    )}

                    {error && !loading && (
                        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-sm text-red-200">
                            <p className="font-medium">Initialization Failed</p>
                            <p className="text-xs text-red-400 mt-1">{error}</p>
                        </div>
                    )}

                    {settled && (
                        <div className="flex flex-col items-center justify-center py-8 space-y-3 text-center">
                            <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-500 flex items-center justify-center text-emerald-400 text-2xl">
                                ✓
                            </div>
                            <p className="text-base font-medium text-emerald-300">Payment Settled!</p>
                            <p className="text-xs text-neutral-400">Unlocking cryptographic signing now...</p>
                        </div>
                    )}

                    {!loading && !settled && vbaDetails && (
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

                {/* Footer */}
                <div className="pt-3 border-t border-neutral-800 text-[11px] text-neutral-500 text-center">
                    Settles automatically via BMoni webhook. Do not refresh.
                </div>
            </div>
        </div>
    );
}