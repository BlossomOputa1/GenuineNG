import { useState } from 'react';
import Icon from '../components/Icon';
import { updatePassword } from '../services/authService';
export default function ResetPasswordPage({ navigate }) {
  const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [done, setDone] = useState(false);
  async function submit(event) { event.preventDefault(); setBusy(true); setError(''); try { await updatePassword(password); setDone(true); } catch (problem) { setError(problem.message || 'Could not update your password.'); } finally { setBusy(false); } }
  return <div className="reset-password-wrap"><section className="login-panel"><span className="eyebrow">RESET PASSWORD</span><h2>{done ? 'Password updated.' : 'Choose a new password.'}</h2>{done ? <button className="button primary" onClick={() => navigate('/app')}>Open workspace <Icon name="arrow" /></button> : <form onSubmit={submit}><div className="field"><label htmlFor="new-password">New password</label><input id="new-password" type="password" minLength="8" value={password} onChange={event => setPassword(event.target.value)} required /></div>{error && <div className="inline-notice form-error"><Icon name="warning" /><p>{error}</p></div>}<button className="button primary full-width" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button></form>}</section></div>;
}
