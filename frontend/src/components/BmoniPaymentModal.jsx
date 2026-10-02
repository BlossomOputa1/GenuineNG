import { useState } from 'react';

const money = (amount) => `₦${Number(amount || 0).toLocaleString('en-NG')}`;

export default function BmoniPaymentModal({ invoice, onClose, onRefresh, busy }) {
  const [copied, setCopied] = useState(false);
  if (!invoice) return null;
  const paid = invoice.status === 'settled';

  async function copy() {
    if (!invoice.accountNumber) return;
    await navigator.clipboard.writeText(invoice.accountNumber);
    setCopied(true);
  }

  return (
    <div className="bmoni-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="bmoni-modal" role="dialog" aria-modal="true" aria-labelledby="bmoni-title">
        <button className="bmoni-close" type="button" onClick={onClose} aria-label="Close payment details">×</button>
        <div className="bmoni-modal-brand"><span className="bmoni-modal-logo"><img src="/images/bmoni-logo.svg" alt="BMONI" width="116" height="25" /></span><small>SANDBOX · TEST PAYMENT</small></div>
        <h2 id="bmoni-title">{paid ? 'Tokens added' : 'Pay for your QR tokens'}</h2>
        <p>{paid ? 'Your token balance is ready for code generation.' : 'Use these sandbox details for your test transfer. Tokens are added only after BMONI confirms this invoice.'}</p>
        <dl className="bmoni-details">
          <div><dt>Tokens</dt><dd>{Number(invoice.tokenQuantity || 0).toLocaleString('en-NG')}</dd></div>
          <div><dt>Amount</dt><dd>{money(invoice.amount)} NGN</dd></div>
          <div><dt>Invoice reference</dt><dd>{invoice.reference}</dd></div>
          <div><dt>Status</dt><dd>{paid ? 'Paid' : 'Pending'}</dd></div>
          {!paid && invoice.accountNumber && <>
            <div><dt>Bank</dt><dd>{invoice.bankName}</dd></div>
            <div><dt>Account name</dt><dd>{invoice.accountName}</dd></div>
            <div><dt>Account number</dt><dd>{invoice.accountNumber} <button type="button" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button></dd></div>
          </>}
        </dl>
        {!paid && <p className="bmoni-note">Include the invoice reference with your transfer. If BMONI omits it from the deposit event, the payment needs manual reconciliation and codes remain locked.</p>}
        <button className="manufacturer-lime-button full" type="button" onClick={onRefresh} disabled={busy}>
          {busy ? 'Checking…' : paid ? 'Continue' : 'Check payment status'}
        </button>
      </section>
    </div>
  );
}
