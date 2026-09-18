import Icon from '../components/Icon';

export default function LoginPage({ session, navigate, onDemoSignIn }) {
  if (session) {
    return (
      <div className="empty-state login-already-in">
        <span className="eyebrow">SIGNED IN</span>
        <h1>Welcome back, {session.user.name}.</h1>
        <p>Your frontend demo workspace is ready.</p>
        <button className="button primary" onClick={() => navigate('/app')}>
          Open workspace <Icon name="arrow" />
        </button>
      </div>
    );
  }

  return (
    <>
      <button type="button" className="back-link" onClick={() => navigate('/')}>
        <Icon name="back" size={17} /> Back to main
      </button>

      <div className="login-layout demo-login-layout">
        <div className="login-intro">
          <span className="eyebrow">FRONTEND PROTOTYPE ACCESS</span>
          <h1>Your checks.<br />Yours to keep.</h1>
          <p>
            Guests can run temporary product checks. Signing in opens the
            ChatGPT-inspired GenuineNG workspace and saves demo history locally on this device.
          </p>
          <div className="login-note">
            <Icon name="lock" size={24} />
            <p>This prototype uses localStorage only. No real account or backend authentication is being created yet.</p>
          </div>
        </div>

        <section className="login-panel demo-login-panel">
          <span className="eyebrow">DEMO USER</span>
          <div className="demo-login-user">
            <div className="demo-login-avatar">EU</div>
            <div>
              <h2>Evaare Ugbor</h2>
              <p>Layer 1 frontend demo profile</p>
            </div>
          </div>
          <p>
            Click once to enter the signed-in workspace. We’ll replace this temporary login with the backend team’s real authentication later.
          </p>
          <button className="button primary full-width" onClick={onDemoSignIn}>
            Sign in as Evaare Ugbor <Icon name="arrow" />
          </button>
          <button className="text-button guest-link" onClick={() => navigate('/')}>
            Continue without signing in <Icon name="arrow" size={16} />
          </button>
        </section>
      </div>
    </>
  );
}
