import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon';
import { approvePartnerFromEmail, reviewPartnerApproval } from '../services/partnerApprovalApi';

export default function AdminPartnerApprovalPage({ routeSearch, session, navigate }) {
  const token = useMemo(() => new URLSearchParams(routeSearch || '').get('token') || '', [routeSearch]);
  const [status, setStatus] = useState('loading');
  const [application, setApplication] = useState(null);
  const [message, setMessage] = useState('Checking this approval link…');
  const [emailDelivered, setEmailDelivered] = useState(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!session?.access_token || !token || startedRef.current) return undefined;
    startedRef.current = true;
    const controller = new AbortController();

    async function run() {
      try {
        const review = await reviewPartnerApproval(token, session.access_token, controller.signal);
        setApplication(review.application);
        if (review.application?.status === 'approved') {
          setStatus('success');
          setMessage(`${review.application.companyName} is already approved.`);
          return;
        }
        if (!review.approval?.canApprove) {
          setStatus('error');
          setMessage(review.approval?.expired ? 'This approval link has expired.' : 'This approval link can no longer be used.');
          return;
        }

        setStatus('approving');
        setMessage(`Approving ${review.application.companyName}…`);
        const approved = await approvePartnerFromEmail(token, session.access_token, controller.signal);
        setApplication(approved.application || review.application);
        setEmailDelivered(approved.applicantEmailDelivered);
        setStatus('success');
        setMessage(approved.alreadyApproved
          ? `${review.application.companyName} is already approved.`
          : `${review.application.companyName} has been approved as a GenuineNG manufacturer partner.`);
      } catch (problem) {
        if (problem.name === 'AbortError') return;
        setStatus('error');
        setMessage(problem.message || 'Manufacturer approval failed.');
      }
    }

    run();
    return () => controller.abort();
  }, [session?.access_token, token]);

  if (!token) {
    return (
      <main className="admin-approval-shell">
        <section className="admin-approval-card error-state">
          <Icon name="warning" size={28} />
          <h1>Invalid approval link.</h1>
          <p>The email link is missing its secure approval token.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-approval-shell">
      <section className={`admin-approval-card ${status === 'success' ? 'success-state' : status === 'error' ? 'error-state' : ''}`}>
        <a className="auth-brand-lockup" href="/" onClick={(event) => { event.preventDefault(); navigate('/'); }}>
          <img src="/icons/favicon.svg" alt="" width="36" height="36" />
          <span>Genuine<span className="brand-suffix">NG</span></span>
        </a>
        <span className="eyebrow">PARTNER APPROVAL</span>
        <div className="admin-approval-status-icon">
          <Icon name={status === 'success' ? 'check' : status === 'error' ? 'warning' : 'shield'} size={25} />
        </div>
        <h1>{status === 'success' ? 'Manufacturer approved.' : status === 'error' ? 'Approval needs attention.' : 'Processing approval…'}</h1>
        <p>{message}</p>

        {application && (
          <dl className="admin-approval-details">
            <div><dt>Company</dt><dd>{application.companyName}</dd></div>
            <div><dt>Contact</dt><dd>{application.contactPersonName}</dd></div>
            <div><dt>Business email</dt><dd>{application.businessEmail}</dd></div>
            {application.phoneNumber && <div><dt>Phone</dt><dd>{application.phoneNumber}</dd></div>}
          </dl>
        )}

        {status === 'success' && emailDelivered === false && (
          <div className="inline-notice form-error"><Icon name="info" size={17} /><p>The manufacturer was approved and their in-app notification was created, but EmailJS could not confirm delivery of the approval email.</p></div>
        )}

        <div className="admin-approval-actions">
          <button className="button primary" onClick={() => navigate('/app')}>Open workspace <Icon name="arrow" /></button>
          <button className="button secondary" onClick={() => navigate('/partners')}>Partner page</button>
        </div>
      </section>
    </main>
  );
}
