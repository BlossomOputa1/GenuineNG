import Icon from "../components/Icon";

export default function PrivacyPolicyPage({ navigate }) {
  return (
    <section className="placeholder-page legal-page">
      <div className="placeholder-card legal-card">
        <span className="placeholder-icon">
          <Icon name="shield" size={22} />
        </span>
        <span className="eyebrow">PRIVACY POLICY</span>
        <h1>How GenuineNG handles your information.</h1>
        <p className="legal-updated">Last updated: September 2026</p>
        <div className="legal-body">
          <p>
            GenuineNG (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is operated by
            GenuineNG (contact.genuineng@gmail.com, Nigeria). We help people in
            Nigeria read and check product label details. This policy explains
            what we collect, why, and your choices. It is a plain-language
            summary, not legal advice.
          </p>
          <h2>1. What we collect</h2>
          <ul>
            <li>
              <strong>Account details:</strong> full name, email address, and
              password (stored securely by Supabase Auth). If you use Google
              sign-in, we receive your Google name, email address, and profile
              photo from Google.
            </li>
            <li>
              <strong>Scan content you submit:</strong> product name,
              manufacturer text, NAFDAC registration number, expiry text, check
              results, and session titles you save to your history.
            </li>
            <li>
              <strong>Label photos:</strong> JPG, PNG, or WebP photos you take
              or upload are resized on your device and sent to our backend only
              to extract label text. We do not keep a library of your photos.
            </li>
            <li>
              <strong>Manufacturer applications:</strong> company name, contact
              person name, business email, and phone number when you apply as a
              partner.
            </li>
            <li>
              <strong>Technical data:</strong> sign-in session tokens (stored on
              your device by Supabase to keep you signed in), in-app
              notifications, and basic device or error information needed for
              security.
            </li>
          </ul>
          <h2>2. Guest vs signed-in use</h2>
          <p>
            You can run a product check as a guest without an account. Guest
            checks are not saved to history. When you sign in, your checks can
            be saved to your workspace history and manufacturer approvals can
            be linked to your account.
          </p>
          <h2>3. How we use your information</h2>
          <ul>
            <li>Create and secure your account and sign you in.</li>
            <li>Extract label text and show registration and expiry results.</li>
            <li>Save and show your scan history and notifications.</li>
            <li>Review manufacturer partner applications.</li>
            <li>Prevent abuse and keep the service reliable.</li>
          </ul>
          <h2>4. Who we share it with</h2>
          <p>
            We use Supabase for authentication and database storage, our backend
            text-extraction service for reading labels, and EmailJS for partner
            emails. We check registration details against NAFDAC Greenbook
            reference data. We do not sell your personal information.
          </p>
          <h2>5. Retention and deletion</h2>
          <p>
            Your history belongs to you and is protected by row-level security
            so only you can see it. You can delete saved sessions from your
            workspace. To request account or data deletion, email
            contact.genuineng@gmail.com from your account email and we will
            confirm once completed.
          </p>
          <h2>6. Security</h2>
          <p>
            We use encrypted connections, authenticated access tokens, and
            database access rules. No method is completely secure, so keep your
            password private and sign out on shared devices.
          </p>
          <h2>7. Your rights and children</h2>
          <p>
            Under Nigeria&rsquo;s Data Protection Act you may request access,
            correction, or deletion of your personal data via
            contact.genuineng@gmail.com. GenuineNG is for adults; children should
            use it with a parent or guardian.
          </p>
          <h2>8. Changes and contact</h2>
          <p>
            If this policy changes materially, we will update this page and the
            date above. Questions: contact.genuineng@gmail.com.
          </p>
        </div>
        <div className="legal-actions">
          <button
            type="button"
            className="button primary"
            onClick={() => navigate("/login")}
          >
            Back to sign in <Icon name="arrow" size={16} />
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={() => navigate("/")}
          >
            Back to main
          </button>
        </div>
      </div>
    </section>
  );
}
