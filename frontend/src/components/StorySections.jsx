import Icon from "./Icon";

const principles = [
  {
    icon: "check",
    title: "Show what matched",
    copy: "A match means a detail lined up with an available record. We show which detail it was.",
  },
  {
    icon: "warning",
    title: "Make warnings clear",
    copy: "An expired date, a number we cannot find, or unclear text deserves a closer look.",
  },
  {
    icon: "info",
    title: "Say when we do not know",
    copy: "Missing or unreadable information is unverified. It is neither a pass nor a fail.",
  },
  {
    icon: "lock",
    title: "Respect your privacy",
    copy: "Guest checks need no account. Your signed-in history is visible only to you.",
  },
];

export function TwoWaysToCheck({ navigate, onMain = false }) {
  return (
    <section
      className={`about-story-offering${onMain ? " home-story-band" : ""}`}
      aria-labelledby="two-ways-heading"
    >
      <div className="about-story-inner about-story-split">
        <div className="about-story-prose">
          <span className="about-story-kicker">TWO WAYS TO CHECK</span>
          <h2 id="two-ways-heading">A better view of what is on the label.</h2>
          <p>
            Everyday checks compare printed registration and expiry details
            with available reference data. Partial information is fine: we
            only check what the label supports.
          </p>
          <p>
            Approved manufacturer partners can also issue unique signed QR
            codes for product units. Those scans can show first-use,
            previously scanned, reuse, or revoked signals.
          </p>
          <div className="about-story-actions">
            <button type="button" className="button primary" onClick={() => navigate("/partners")}>
              Become a partner <Icon name="arrow" size={16} />
            </button>
            <button type="button" className="button secondary" onClick={() => navigate("/manufacturer")}>
              Manufacturer portal
            </button>
          </div>
        </div>
        <div className="about-story-visual" aria-label="Two product check methods">
          <div className="about-story-visual-card">
            <span><Icon name="scan" size={27} /></span>
            <small>EVERYDAY PRODUCTS · LAYER 1</small>
            <strong>Registry label check</strong>
            <p>Read the label. Review the details. See what matched.</p>
          </div>
          <div className="about-story-visual-card">
            <span><Icon name="qr" size={27} /></span>
            <small>PARTNERED MANUFACTURERS · LAYER 2</small>
            <strong>GenuineNG Code</strong>
            <p>Check signed unit codes and their scan signals.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function WhatWeStandFor({ onMain = false }) {
  return (
    <section
      className={`about-story-honesty${onMain ? " home-story-band home-story-standards" : ""}`}
      aria-labelledby="honesty-heading"
    >
      <div className="about-story-inner">
        <div className="about-story-section-heading">
          <span className="about-story-kicker">WHAT WE STAND FOR</span>
          <h2 id="honesty-heading">Honest answers, by design.</h2>
          <p>Every result should be useful and clear about its limits.</p>
        </div>
        <div className="about-story-honesty-grid">
          {principles.map((principle) => (
            <div className="about-story-honesty-card" key={principle.title}>
              <span className="about-story-honesty-icon"><Icon name={principle.icon} size={22} /></span>
              <h3>{principle.title}</h3>
              <p>{principle.copy}</p>
            </div>
          ))}
        </div>
        <p className="about-story-caveat">
          Counterfeit products can copy real-looking label details. A GenuineNG
          label check is not NAFDAC certification, proof that a product is
          genuine or fake, or medical advice. If you doubt a product, do not
          use it and consult a pharmacist, its manufacturer, or NAFDAC.
        </p>
      </div>
    </section>
  );
}
