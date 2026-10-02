import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '../../components/Icon';
import BmoniPaymentModal from '../../components/BmoniPaymentModal';
import { buyTokens, getTokenAccount, getTokenInvoice, getBillingConfig, getInvoices } from '../../services/manufacturerApi';

const money = (amount) => `₦${Number(amount || 0).toLocaleString('en-NG')}`;
const date = (value) => value ? new Intl.DateTimeFormat('en-NG', {
  day: 'numeric', month: 'short', year: 'numeric',
}).format(new Date(value)) : '—';

export default function PaymentsPage({ navigate }) {
  const [config, setConfig] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [account, setAccount] = useState(null);
  const [quantity, setQuantity] = useState('100');
  const [purchasing, setPurchasing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const nextConfig = await getBillingConfig();
      setConfig(nextConfig);
      if (nextConfig.enabled) {
        const [nextInvoices, nextAccount] = await Promise.all([getInvoices(), getTokenAccount()]);
        setInvoices(nextInvoices);
        setAccount(nextAccount);
      }
    } catch (problem) { setError(problem.message || 'Could not load payments.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const pending = invoices.filter((item) => item.status === 'pending');
  const settled = invoices.filter((item) => item.status === 'settled');
  const visible = useMemo(() => filter === 'all' ? invoices : invoices.filter((item) => item.status === filter), [filter, invoices]);

  async function refreshSelected() {
    if (!selected) return;
    setChecking(true);
    setError('');
    try {
      const updated = await getTokenInvoice(selected.id);
      if (updated) {
        setSelected(updated);
        setInvoices((items) => items.map((item) => item.id === updated.id ? updated : item));
        if (updated.status === 'settled') setAccount(await getTokenAccount());
      }
    } catch (problem) { setError(problem.message || 'Could not check this invoice.'); }
    finally { setChecking(false); }
  }

  async function purchase(event) {
    event.preventDefault();
    const count = Number(quantity);
    if (!Number.isInteger(count) || count < 1 || count > 100000) {
      setError('Choose between 1 and 100,000 tokens.');
      return;
    }
    setPurchasing(true);
    setError('');
    try {
      const invoice = await buyTokens(count);
      setSelected(invoice);
      setInvoices((items) => [invoice, ...items]);
    } catch (problem) { setError(problem.message || 'Could not create a token invoice.'); }
    finally { setPurchasing(false); }
  }

  return <div className="manufacturer-page manufacturer-payments-page">
    <section className="manufacturer-page-intro compact">
      <div>
        <span className="manufacturer-eyebrow">BILLING · SANDBOX</span>
        <h1>Payments</h1>
        <p>Buy QR tokens and track your sandbox payments.</p>
      </div>
    </section>

    {error && <div className="inline-notice" role="alert"><Icon name="info" size={18} /><p>{error}</p></div>}
    {loading ? <div className="empty-state" role="status"><p>Loading payments…</p></div> : <>
        {!config?.enabled && <section className="manufacturer-panel manufacturer-payments-off">
          <h2>Sandbox payments are not active yet</h2>
          <p>You can preview this page now. Buying tokens becomes available after the sandbox setup is enabled.</p>
        </section>}
        <section className="manufacturer-payments-feature">
          <div className="manufacturer-payments-feature-copy">
            <span className="manufacturer-eyebrow">CODE ISSUANCE</span>
            <h2>Keep your codes ready.</h2>
            <p>Buy tokens at {money(config.pricePerCode)} each. Generating one signed GenuineNG QR code uses one token.</p>
            <button type="button" className="manufacturer-lime-button" onClick={() => navigate('/manufacturer/generate-codes')}>
              Generate codes <Icon name="arrow" size={18} />
            </button>
          </div>
          <form className="manufacturer-payments-provider" aria-label="Buy tokens through BMONI sandbox" onSubmit={purchase}>
            <small>PAYMENT RAIL · SANDBOX</small>
            <img className="manufacturer-bmoni-logo" src="/images/bmoni-logo.svg" alt="BMONI" width="174" height="38" />
            <label>Number of tokens
              <input type="number" min="1" max="100000" step="1" required disabled={!config?.enabled} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
            </label>
            <span>Total: {money(Number(quantity || 0) * config.pricePerCode)}</span>
            <button className="manufacturer-lime-button" type="submit" disabled={purchasing || !config?.enabled}>{purchasing ? 'Creating invoice…' : 'Buy tokens'}</button>
          </form>
        </section>

        <section className="manufacturer-payments-stats" aria-label="Invoice summary">
          <article className="manufacturer-panel"><span>Tokens left</span><strong>{config?.enabled ? Number(account?.balance || 0).toLocaleString('en-NG') : '—'}</strong><small>Available for code generation</small></article>
          <article className="manufacturer-panel"><span>Pending invoices</span><strong>{pending.length}</strong><small>{money(pending.reduce((sum, item) => sum + item.amount, 0))} awaiting confirmation</small></article>
          <article className="manufacturer-panel"><span>Paid invoices</span><strong>{settled.length}</strong><small>{money(settled.reduce((sum, item) => sum + item.amount, 0))} confirmed</small></article>
          <article className="manufacturer-panel"><span>Price per token</span><strong>{money(config.pricePerCode)}</strong><small>One token issues one QR code</small></article>
        </section>

        <section className="manufacturer-panel manufacturer-payments-list">
          <div className="manufacturer-payments-list-head">
            <div><span className="manufacturer-eyebrow">YOUR RECORDS</span><h2>Invoice history</h2></div>
            <button type="button" className="manufacturer-secondary-button" onClick={load} disabled={loading}>Refresh</button>
          </div>
          <div className="manufacturer-payments-filters" role="group" aria-label="Filter invoices">
            {[['all', 'All'], ['pending', 'Pending'], ['settled', 'Paid']].map(([key, label]) =>
              <button type="button" key={key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)} aria-pressed={filter === key}>{label}</button>
            )}
          </div>
          {visible.length === 0 ? <div className="manufacturer-payments-empty">
            <h3>{invoices.length ? 'No invoices in this view' : 'No invoices yet'}</h3>
            <p>{invoices.length ? 'Try another filter.' : 'Buy tokens to create your first invoice.'}</p>
          </div> : <ul className="manufacturer-payments-rows">
            {visible.map((item) => <li key={item.id}>
              <div><strong>{item.reference}</strong><small>{Number(item.tokenQuantity || 0).toLocaleString('en-NG')} tokens · {date(item.createdAt)}</small></div>
              <strong>{money(item.amount)}</strong>
              <span className={`manufacturer-payment-status ${item.status}`}>{item.status === 'settled' ? 'Paid' : 'Pending'}</span>
              <button type="button" onClick={() => setSelected(item)}>View invoice</button>
            </li>)}
          </ul>}
        </section>
      </>}
    <BmoniPaymentModal invoice={selected} onClose={() => setSelected(null)} onRefresh={refreshSelected} busy={checking} />
  </div>;
}
