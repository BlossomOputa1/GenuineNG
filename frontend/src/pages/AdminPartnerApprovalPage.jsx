import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon';
import {
  approvePartnerFromEmail,
  getPartnerEmailStatus,
  listPendingPartnerApplications,
  rejectPartnerApplication,
  resendPartnerApplication,
  reviewPartnerApproval,
} from '../services/partnerApprovalApi';

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
          if (review.approval?.expired) {
            setMessage('This approval link has expired. Ask for a new link via Resend from the pending list.');
          } else if (review.approval?.used) {
            setMessage('This approval link has already been used.');
          } else {
            setMessage('This approval link can no longer be used.');
          }
          return;
        }

        setStatus('ready');
        setMessage(`Review ${review.application.companyName}, then confirm approval.`);
      } catch (problem) {
        if (problem.name === 'AbortError') return;
        setStatus('error');
        setMessage(problem.message || 'Manufacturer approval failed.');
      }
    }

    run();
    return () => controller.abort();
  }, [session?.access_token, token]);

  async function confirmApproval() {
    if (status !== 'ready' || !session?.access_token || !token) return;
    setStatus('approving');
    setMessage(`Approving ${application?.companyName || 'manufacturer'}…`);
    try {
      const approved = await approvePartnerFromEmail(token, session.access_token);
      setApplication(approved.application || application);
      setEmailDelivered(approved.applicantEmailDelivered);
      setStatus('success');
      setMessage(approved.alreadyApproved
        ? `${(approved.application || application)?.companyName} is already approved.`
        : `${(approved.application || application)?.companyName} has been approved as a GenuineNG manufacturer partner.`);
    } catch (problem) {
      if (problem.name === 'AbortError') return;
      setStatus(problem.code === 'ACCOUNT_REQUIRED' ? 'ready' : 'error');
      setMessage(problem.code === 'ACCOUNT_REQUIRED'
        ? `${problem.message} The link stays valid — retry after they register.`
        : (problem.message || 'Manufacturer approval failed.'));
    }
  }

  async function confirmReject() {
    if (status !== 'ready' || !session?.access_token || !token) return;
    setStatus('approving');
    setMessage(`Rejecting ${application?.companyName || 'manufacturer'}…`);
    try {
      await rejectPartnerApplication(token, session.access_token);
      setStatus('success');
      setMessage(`${application?.companyName} was rejected and the link can no longer be used.`);
    } catch (problem) {
      if (problem.name === 'AbortError') return;
      setStatus('error');
      setMessage(problem.message || 'Could not reject this application.');
    }
  }

  if (!token) {
    return <PendingApplicationsView session={session} navigate={navigate} />;
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
        <h1>{status === 'success' ? 'Manufacturer approved.' : status === 'error' ? 'Approval needs attention.' : status === 'ready' ? 'Review application.' : 'Processing approval…'}</h1>
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
          {status === 'ready' && (
            <>
              <button className="button primary" onClick={confirmApproval}>Confirm approval <Icon name="check" /></button>
              <button className="button secondary" onClick={confirmReject}>Reject</button>
            </>
          )}
          <button className="button primary" onClick={() => navigate('/app')}>Open workspace <Icon name="arrow" /></button>
          <button className="button secondary" onClick={() => navigate('/partners')}>Partner page</button>
        </div>
      </section>
    </main>
  );
}

function PendingApplicationsView({ session, navigate }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [emailStatus, setEmailStatus] = useState(null);
  const [busyId, setBusyId] = useState('');

  useEffect(() => {
    if (!session?.access_token) return undefined;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setNotice('');
      try {
        const [list, email] = await Promise.all([
          listPendingPartnerApplications(session.access_token, controller.signal),
          getPartnerEmailStatus(session.access_token, controller.signal).catch(() => null),
        ]);
        setPending(list.applications || []);
        setEmailStatus(email?.email || null);
      } catch (problem) {
        if (problem.name !== 'AbortError') setNotice(problem.message || 'Could not load pending applications.');
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [session?.access_token]);

  async function resend(applicationId) {
    if (!session?.access_token || !applicationId) return;
    setBusyId(applicationId);
    setNotice('');
    try {
      const result = await resendPartnerApplication(applicationId, session.access_token);
      setNotice(result?.email?.delivered
        ? 'New approval link sent to admins.'
        : 'New approval link created, but admin email could not be confirmed. Copy the link from the admin inbox or logs.');
    } catch (problem) {
      setNotice(problem.message || 'Could not resend this application.');
    } finally {
      setBusyId('');
    }
  }

  return (
    <main className="admin-approval-shell">
      <section className="admin-approval-card">
        <a className="auth-brand-lockup" href="/" onClick={(event) => { event.preventDefault(); navigate('/'); }}>
          <img src="/icons/favicon.svg" alt="" width="36" height="36" />
          <span>Genuine<span className="brand-suffix">NG</span></span>
        </a>
        <span className="eyebrow">PARTNER APPROVAL</span>
        <h1>Pending applications.</h1>
        <p>Open this page without a token to recover applications when an approval email was lost or expired.</p>
        {emailStatus && !emailStatus.configured && (
          <div className="inline-notice form-error"><Icon name="warning" size={17} /><p>Admin email is not fully configured (admins: {emailStatus.adminCount}, service: {emailStatus.serviceConfigured ? 'ok' : 'missing'}). Applications still save and appear below.</p></div>
        )}
        {notice && <div className="inline-notice form-error"><Icon name="info" size={17} /><p>{notice}</p></div>}
        {loading ? (
          <p>Loading pending applications…</p>
        ) : pending.length === 0 ? (
          <p>No pending applications.</p>
        ) : (
          <dl className="admin-approval-details">
            {pending.map((item) => (
              <div key={item.id}>
                <dt>{item.companyName} — {item.businessEmail}</dt>
                <dd>{item.contactPersonName} · Submitted {item.submittedAt ? new Date(item.submittedAt).toLocaleString() : 'unknown'} <button type="button" className="button secondary" disabled={busyId === item.id} onClick={() => resend(item.id)}>{busyId === item.id ? 'Resending…' : 'Resend link'}</button></dd>
              </div>
            ))}
          </dl>
        )}
        <div className="admin-approval-actions">
          <button className="button primary" onClick={() => navigate('/app')}>Open workspace <Icon name="arrow" /></button>
          <button className="button secondary" onClick={() => navigate('/partners')}>Partner page</button>
        </div>
      </section>
    </main>
  );
}
