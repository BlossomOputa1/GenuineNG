import Icon from "../components/Icon";

const stats = [
  { value: "13-15%", label: "Medicines NAFDAC estimates are fake" },
  { value: "70%", label: "Higher estimate reported by another health agency" },
  { value: "50%+", label: "Seized fakes linked to cosmetics, food and drinks" },
];

const steps = [
  {
    title: "1. Capture the label",
    copy: "Take a photo of the product label with your camera or upload a JPG, PNG, or WebP image. Photos are resized on your device before anything is sent.",
  },
  {
    title: "2. Review the details",
    copy: "GenuineNG extracts the printed product name, manufacturer, NAFDAC registration number, and expiry date. You confirm or correct the text before anything is checked.",
  },
  {
    title: "3. See what matched",
    copy: "We compare the registration number against available records and validate the expiry date. Every result shows what matched, what raised a warning, and what could not be checked.",
  },
  {
    title: "4. Save it (optional)",
    copy: "Guests can check without an account. Signed-in users can save checks to their workspace history, pin important sessions, and revisit them later.",
  },
];

const modes = [
  {
    icon: "scan",
    title: "Registry label check",
    copy: "For everyday products: packaged foods, medicines, cosmetics, and drinks. Checks the printed registration number and expiry date against reference data. Partial information is fine. GenuineNG checks only what the label supports.",
  },
  {
    icon: "qr",
    title: "GenuineNG Code",
    copy: "For partnered manufacturers: unique signed QR codes per unit. Scans report first scan, previously scanned, reuse-limit-reached, or revoked signals, with manufacturer-side verification in the portal.",
  },
];

const meanings = [
  {
    title: "Match",
    copy: "The detail lined up with the available record. For example, the registration number exists and the expiry date is valid.",
  },
  {
    title: "Warning",
    copy: "Something needs attention. For example, the product is expired, the number was not found, or the text was unclear. Do not use a product you doubt.",
  },
  {
    title: "Unverified / not checked",
    copy: "There was not enough reliable information to check that item. For example, a missing field or an unreadable photo. It is not a pass or a fail.",
  },
];

export default function AboutPage({ navigate }) {
  return (
    <div className="about-page">
      <section className="about-hero" aria-labelledby="about-heading">
        <span className="eyebrow">ABOUT GENUINENG</span>
        <h1 id="about-heading">Fake products shouldn&rsquo;t pass unnoticed.</h1>
        <p className="about-lead">
          GenuineNG helps people in Nigeria quickly read and check product
          label details: product name, manufacturer, NAFDAC registration
          number, and expiry date, and gives partnered manufacturers a way to
          issue verifiable unit codes. A scan takes seconds, works on your
          phone, and is honest about what a label check can and cannot prove.
        </p>
        <div className="about-hero-actions">
          <button
            type="button"
            className="button primary"
            onClick={() => navigate("/")}
          >
            Start checking <Icon name="arrow" size={16} />
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={() => navigate("/contact")}
          >
            Contact us
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={() => navigate("/login")}
          >
            Create account
          </button>
        </div>
      </section>

      <section className="about-section" aria-label="Why GenuineNG exists">
        <div className="about-section-head">
          <span className="reason-tag">REASON FOR GENUINENG</span>
          <h2>Counterfeits are common. Checking should be simple.</h2>
          <p>
            Fake products are a serious problem in Nigeria, and shoppers often
            have no quick way to know if what they are buying is trustworthy.
            NAFDAC estimates <strong>13-15% of medicines in circulation are
            fake</strong>, while other estimates run much higher, and
            counterfeiters keep finding smarter ways to circulate fakes without
            customer knowledge.
          </p>
        </div>
        <div className="reason-stats about-stats" aria-label="Counterfeit product statistics">
          {stats.map((stat) => (
            <div className="reason-stat-card" key={stat.value}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="about-section" aria-labelledby="about-modes-heading">
        <div className="about-section-head">
          <span className="reason-tag">WHAT GENUINENG DOES</span>
          <h2 id="about-modes-heading">Two ways to check, one honest result.</h2>
        </div>
        <div className="about-cards">
          {modes.map((mode) => (
            <div className="about-card" key={mode.title}>
              <span className="placeholder-icon about-card-icon">
                <Icon name={mode.icon} size={22} />
              </span>
              <h3>{mode.title}</h3>
              <p>{mode.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="about-section" aria-labelledby="about-steps-heading">
        <div className="about-section-head">
          <span className="reason-tag">HOW A CHECK WORKS</span>
          <h2 id="about-steps-heading">From photo to result in four steps.</h2>
        </div>
        <ol className="about-steps">
          {steps.map((step) => (
            <li key={step.title}>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="about-section" aria-labelledby="about-results-heading">
        <div className="placeholder-card about-honesty">
          <span className="placeholder-icon">
            <Icon name="shield" size={22} />
          </span>
          <span className="eyebrow">WHAT RESULTS MEAN</span>
          <h2 id="about-results-heading">Clear about what we can prove.</h2>
          <div className="about-meanings">
            {meanings.map((item) => (
              <div key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </div>
            ))}
          </div>
          <p className="about-disclaimer">
            Counterfeit products can copy real-looking label details. GenuineNG
            makes printed information easier to read, review, and check. It is
            not NAFDAC certification, not proof a product is genuine or fake,
            and not medical advice. If you doubt a product, do not use it and
            consult a pharmacist, the manufacturer, or NAFDAC.
          </p>
        </div>
      </section>

      <section className="about-section" aria-labelledby="about-makers-heading">
        <div className="about-section-head">
          <span className="reason-tag">FOR MANUFACTURERS</span>
          <h2 id="about-makers-heading">Issue codes. See scan activity.</h2>
          <p>
            Approved manufacturers use the Layer 2 portal to register products
            and batches, generate signed unit QR codes, and view aggregate scan
            activity, including genuine, not-genuine, and reuse signals per
            batch. Applications are reviewed manually before portal access is
            granted.
          </p>
          <div className="about-hero-actions">
            <button
              type="button"
              className="button primary"
              onClick={() => navigate("/partners")}
            >
              Become a partner <Icon name="arrow" size={16} />
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={() => navigate("/manufacturer")}
            >
              Open manufacturer portal
            </button>
          </div>
        </div>
      </section>

      <section className="about-section" aria-labelledby="about-privacy-heading">
        <div className="about-section-head">
          <span className="reason-tag">PRIVACY AND ACCESS</span>
          <h2 id="about-privacy-heading">Your data stays yours.</h2>
          <p>
            Guest checks need no account and are not saved. Signed-in history
            is protected so only you can see it, label photos are processed to
            extract text rather than kept as a library, and you can request
            deletion at contact.genuineng@gmail.com. Accounts are free. Sign
            in with email or Google.
          </p>
          <div className="about-links">
            <button
              type="button"
              className="text-button"
              onClick={() => navigate("/privacy")}
            >
              Privacy Policy <Icon name="arrow" size={15} />
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => navigate("/terms")}
            >
              Terms of Service <Icon name="arrow" size={15} />
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => navigate("/contact")}
            >
              Contact us <Icon name="arrow" size={15} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
