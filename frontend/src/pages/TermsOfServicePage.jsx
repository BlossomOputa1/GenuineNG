import Icon from "../components/Icon";

export default function TermsOfServicePage({ navigate }) {
  function goBack() {
    if (window.history.length > 1) window.history.back();
    else navigate("/");
  }

  return (
    <section className="placeholder-page legal-page">
      <div className="placeholder-card legal-card">
        <button type="button" className="back-link" onClick={goBack}>
          <Icon name="back" size={17} /> Back
        </button>
        <span className="placeholder-icon">
          <Icon name="document" size={22} />
        </span>
        <span className="eyebrow">TERMS OF SERVICE</span>
        <h1>The rules for using GenuineNG.</h1>
        <p className="legal-updated">Last updated: September 2026</p>
        <div className="legal-body">
          <p>
            These terms cover your use of GenuineNG, operated by GenuineNG
            (contact.genuineng@gmail.com, Nigeria). By creating an account or
            signing in, you agree to them.
          </p>
          <h2>1. What GenuineNG is</h2>
          <p>
            GenuineNG helps you read printed label details and compare them
            with available records. Results show what matched, what raised a
            warning, and what could not be checked. A GenuineNG result is not
            NAFDAC certification, not proof that a product is genuine or fake,
            and not medical advice. If you doubt a product, do not use it and
            consult a pharmacist, the manufacturer, or NAFDAC.
          </p>
          <h2>2. Eligibility and accounts</h2>
          <ul>
            <li>You must be 18 or older, or use GenuineNG with a guardian.</li>
            <li>Provide accurate name and email details.</li>
            <li>Keep your password private and sign out on shared devices.</li>
            <li>
              You are responsible for activity under your account. Tell us at
              contact.genuineng@gmail.com if your account is misused.
            </li>
          </ul>
          <h2>3. Acceptable use</h2>
          <ul>
            <li>Submit only labels you are genuinely checking.</li>
            <li>Do not submit false, misleading, or unlawful content.</li>
            <li>
              Do not abuse, scrape, disrupt, or attempt to bypass security or
              access controls.
            </li>
          </ul>
          <h2>4. Manufacturer partners</h2>
          <p>
            Manufacturer portal access requires an approved application with
            truthful company, contact, and product information. Approval does
            not endorse product quality. Do not issue or represent fake
            GenuineNG codes. We may suspend access for inaccurate submissions or
            misuse.
          </p>
          <h2>5. Results and liability</h2>
          <p>
            Records may be incomplete or out of date, photos may be unclear,
            and counterfeit products can copy real-looking details. To the
            extent permitted by Nigerian law, GenuineNG is provided
            &ldquo;as is&rdquo; without warranties, and we are not liable for
            decisions you make from a result, including purchase, use, or
            health outcomes.
          </p>
          <h2>6. Availability and changes</h2>
          <p>
            The service may need internet access and can be temporarily
            unavailable during maintenance or outages. We may update features
            or these terms; material changes will be reflected on this page
            with a new date. Continued use after changes means you accept the
            updated terms.
          </p>
          <h2>7. Termination, law, and contact</h2>
          <p>
            You may stop using GenuineNG at any time and request account
            deletion. We may suspend accounts that breach these terms. These
            terms are governed by the laws of Nigeria. Contact:
            contact.genuineng@gmail.com.
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
