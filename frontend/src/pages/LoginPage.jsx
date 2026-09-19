import { useState } from 'react';
import Icon from '../components/Icon';
import { getDisplayName, supabaseConfigured } from '../services/supabase';
import { sendPasswordReset, signInWithPassword, signUpWithPassword } from '../services/authService';

export default function LoginPage({ session, navigate }) {
  const [mode, setMode] = useState('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (session?.user) {
    return <div className="empty-state login-already-in"><span className="eyebrow">SIGNED IN</span><h1>Welcome back, {getDisplayName(session.user)}.</h1><p>Your saved GenuineNG checks are ready.</p><button className="button primary" onClick={() => navigate('/app')}>Open workspace <Icon name="arrow" /></button></div>;
  }

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if (mode === 'signup') {
        const data = await signUpWithPassword({ email, password, fullName });
        if (data.session) navigate('/app');
        else setMessage('Account created. Check your email to confirm the address, then sign in.');
      } else {
        await signInWithPassword(email, password); navigate('/app');
      }
    } catch (problem) { setError(problem.message || 'Authentication failed.'); }
    finally { setBusy(false); }
  }

  async function forgot() {
    if (!email.trim()) { setError('Enter your email first, then choose Forgot password.'); return; }
    setBusy(true); setError(''); setMessage('');
    try { await sendPasswordReset(email.trim()); setMessage('Password reset link sent. Check your email.'); }
    catch (problem) { setError(problem.message || 'Could not send a password reset email.'); }
    finally { setBusy(false); }
  }

  return <>
    <button type="button" className="back-link" onClick={() => navigate('/')}><Icon name="back" size={17} /> Back to main</button>
    <div className="login-layout auth-only-layout">
      <section className="login-panel real-auth-panel">
        <a className="auth-brand-lockup" href="/" onClick={event => { event.preventDefault(); navigate('/'); }} aria-label="GenuineNG home">
          <img src="/icons/favicon.svg" alt="" width="36" height="36" />
          <span>Genuine<span className="brand-suffix">NG</span></span>
        </a>
        <div className="auth-mode-tabs"><button type="button" className={mode === 'signin' ? 'active' : ''} onClick={() => setMode('signin')}>Sign in</button><button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Create account</button></div>
        {!supabaseConfigured && <div className="inline-notice form-error"><Icon name="info" /><p>Supabase is not configured yet. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to <code>frontend/.env.local</code>.</p></div>}
        <form onSubmit={submit}>
          {mode === 'signup' && <div className="field"><label htmlFor="auth-name">Full name</label><input id="auth-name" value={fullName} onChange={event => setFullName(event.target.value)} autoComplete="name" required /></div>}
          <div className="field"><label htmlFor="auth-email">Email</label><input id="auth-email" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" required /></div>
          <div className="field"><label htmlFor="auth-password">Password</label><input id="auth-password" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength="8" required /></div>
          {error && <div className="inline-notice form-error" role="alert"><Icon name="warning" /><p>{error}</p></div>}
          {message && <div className="inline-notice" role="status"><Icon name="check" /><p>{message}</p></div>}
          <button type="submit" className="button primary full-width" disabled={busy || !supabaseConfigured}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'} {!busy && <Icon name="arrow" />}</button>
        </form>
        {mode === 'signin' && <button type="button" className="text-button auth-forgot" onClick={forgot} disabled={busy}>Forgot password?</button>}
        <button type="button" className="text-button guest-link" onClick={() => navigate('/')}>Continue without signing in <Icon name="arrow" size={16} /></button>
      </section>
    </div>
  </>;
}
