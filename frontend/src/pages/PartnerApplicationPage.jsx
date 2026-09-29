import { useState } from 'react';
import Icon from '../components/Icon';
import { getApiBaseUrl } from '../services/api';

const emptyForm = { companyName: '', contactPersonName: '', businessEmail: '', phoneNumber: '' };

export default function PartnerApplicationPage({ navigate }) {
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [emailWarning, setEmailWarning] = useState('');

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setEmailWarning('');
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/partner-applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message || 'Could not submit the application.');
      const email = body?.email;
      const delivered = email ? Boolean(email.delivered) : Boolean(body?.adminEmailDelivered);
      if (email && !delivered) {
        const reason = String(email.reason || 'send_failed');
        setEmailWarning(
          reason === 'not_configured'
            ? 'Application saved, but admin email is not configured yet. An administrator can still review it from the pending list.'
            : 'Application saved, but the admin notification email could not be confirmed. An administrator can still review it from the pending list.',
        );
      }
      setSubmitted(true);
      setForm(emptyForm);
    } catch (problem) {
      setError(problem.message || 'Could not submit the application.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="partner-application-page">
      <div className="partner-application-copy">
        <span className="eyebrow">MANUFACTURER PARTNERS</span>
        <h1>Apply to become a GenuineNG partner.</h1>
        <p>Applications are reviewed manually. Approved manufacturers can register products and batches, generate signed unit QR codes, export production files and view scan activity.</p>
        <button type="button" className="text-button" onClick={() => navigate('/manufacturer')}>Already approved? Open manufacturer portal <Icon name="arrow" size={15} /></button>
      </div>
      <div className="partner-application-card">
        {submitted ? (
          <div className="partner-application-success">
            <span><Icon name="check" size={22} /></span>
            <h2>Application received.</h2>
            <p>GenuineNG has been notified. Use the same business email for your GenuineNG account so approval can activate your Manufacturer Portal and in-app notification.</p>
            {emailWarning && <div className="inline-notice form-error"><Icon name="warning" size={17} /><p>{emailWarning}</p></div>}
            <button type="button" className="button secondary" onClick={() => setSubmitted(false)}>Submit another application</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h2>Partner application</h2>
            <label>Company name<input required maxLength="160" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></label>
            <label>Contact person’s name<input required maxLength="120" value={form.contactPersonName} onChange={(e) => setForm({ ...form, contactPersonName: e.target.value })} /></label>
            <label>Business email<input required type="email" maxLength="254" value={form.businessEmail} onChange={(e) => setForm({ ...form, businessEmail: e.target.value })} /></label>
            <label>Phone number<input required type="tel" maxLength="40" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} /></label>
            {error && <div className="inline-notice form-error"><Icon name="warning" size={17} /><p>{error}</p></div>}
            <button className="button primary full-width" disabled={busy}>{busy ? 'Submitting…' : 'Apply to become a partner'}</button>
          </form>
        )}
      </div>
    </section>
  );
}
