import Icon from "../components/Icon";
import { TwoWaysToCheck, WhatWeStandFor } from "../components/StorySections";

const layerOneSteps = [
  {
    icon: "camera",
    title: "Capture the label",
    copy: "Take a photo or upload a product label. GenuineNG reads the printed name, manufacturer, registration number, and expiry date.",
  },
  {
    icon: "edit",
    title: "Review what was read",
    copy: "Confirm or correct the extracted details before the check runs. Partial information is fine.",
  },
  {
    icon: "scan",
    title: "See what matched",
    copy: "We compare the registration number with available reference records and check the expiry date.",
  },
  {
    icon: "info",
    title: "Understand the result",
    copy: "Matches, warnings, and details we could not check are shown separately. A registry match alone does not prove the unit is genuine.",
  },
];

const layerTwoSteps = [
  {
    icon: "package",
    title: "Register the product",
    copy: "An approved manufacturer adds its products and production batches in the partner portal.",
  },
  {
    icon: "qr",
    title: "Issue a code per unit",
    copy: "GenuineNG generates a unique, cryptographically signed code for each individual unit in the batch.",
  },
  {
    icon: "scan",
    title: "Print and scan",
    copy: "The manufacturer prints each code on its packaging. Customers scan it with a phone when they encounter the product.",
  },
  {
    icon: "shield",
    title: "Read the scan signal",
    copy: "The result checks the code signature and shows signals such as first scan, previous scan, reuse limit reached, or revoked.",
  },
];

const benefits = [
  {
    icon: "scan",
    title: "For consumers",
    points: [
      "Check a label for free with a phone before buying or using a product.",
      "See exactly what matched, what raised a warning, and what remains unverified.",
      "Scan a partner's unique code for an additional unit-level signal.",
    ],
  },
  {
    icon: "shield",
    title: "For manufacturers",
    points: [
      "Give each unit a signed code that is harder to imitate than a copied label.",
      "Help customers check the product at the point of purchase.",
      "See aggregate scan activity and possible reuse or revoked-code signals.",
    ],
  },
];

export default function AboutPage({ navigate }) {
  return (
    <article className="about-story-page">
      <section className="about-story-hero" aria-labelledby="about-heading">
        <div className="about-story-inner">
          <span className="about-story-kicker">ABOUT GENUINENG</span>
          <h1 id="about-heading">
            Fake products shouldn&rsquo;t <span>pass unnoticed.</span>
          </h1>
          <p>
            A clearer way to read, review, and check the details printed on
            everyday products in Nigeria.
          </p>
        </div>
      </section>

      <section className="about-story-problem" aria-labelledby="about-problem-heading">
        <div className="about-story-inner about-story-problem-layout">
          <div className="about-story-problem-intro">
            <span className="about-story-kicker">WHY THIS MATTERS</span>
            <h2 id="about-problem-heading">The Problem</h2>
            <div className="about-story-problem-collage" aria-hidden="true">
              <figure className="about-story-problem-photo about-story-problem-photo--main">
                <img
                  src="/images/about-problem-main.webp"
                  alt=""
                  loading="lazy"
                  onError={(event) => { event.currentTarget.hidden = true; }}
                />
                <span className="about-story-image-placeholder">Main product image</span>
              </figure>
              <figure className="about-story-problem-photo about-story-problem-photo--detail">
                <img
                  src="/images/about-problem-detail.webp"
                  alt=""
                  loading="lazy"
                  onError={(event) => { event.currentTarget.hidden = true; }}
                />
                <span className="about-story-image-placeholder">Detail image</span>
              </figure>
              <div className="about-story-problem-note" aria-hidden="true">
                <span>LOOK CLOSER</span>
                <strong>Trust can be copied.</strong>
              </div>
            </div>
          </div>
          <div className="about-story-problem-copy">
            <p>
              Fake products are a serious problem in Nigeria, and consumers often have no quick way to know if what they're buying is trustworthy. Counterfeiters have found smart ways to circulate fake products without customers ever knowing — and the systems meant to catch them are struggling to keep up. NAFDAC says 13–15% of medicines in circulation are fake. A 2022 government health report says it's closer to 70%. That gap alone tells you how little consistency there is in the system meant to protect us. Health economists link counterfeit drugs to roughly 100,000 deaths a year across Africa — and it's not just medicine anymore. NAFDAC's own 2026 briefing found cosmetics, food, and drinks now make up over half of everything it seizes.
            </p>
            <p>
              Here's the part that should worry everyone: the one symbol Nigerians are told to trust — the NAFDAC number — can be faked too. In Jos, investigators found counterfeiters printing real, valid-looking registration numbers and false manufacturing dates straight onto smuggled, repackaged medicine. The fake and the genuine become indistinguishable by eye. When the mark of trust itself can be cloned, trust has nowhere left to stand.
            </p>
            <p>
              And the damage doesn't stop at the consumer. Every counterfeit sold under a real company's name quietly steals from that company too — the sales, the reputation, the decades of trust a brand spent years building, chipped away by a single convincing fake at a market stall. Manufacturers pay the price for a system's unreliability they had no part in creating.
            </p>
            <details className="about-story-sources">
              <summary>Sources and context</summary>
              <p>
                NAFDAC disputes the 70% estimate. The roughly 100,000 annual deaths figure is an older Africa-wide estimate, not a current Nigeria count. See the <a href="https://nafdac.gov.ng/response-of-nafdac-to-publication-in-vanguard-newspaper-alleging-that-70-of-all-medicines-in-nigeria-are-fake-grossly-inaccurate-statement-and-fake-allusions/" target="_blank" rel="noreferrer">NAFDAC response</a>, <a href="https://www.thinkglobalhealth.org/article/nigerias-counterfeit-drug-epidemic" target="_blank" rel="noreferrer">the account of the differing estimates</a>, <a href="https://guardian.ng/features/tackling-fake-medicines-food-products/" target="_blank" rel="noreferrer">the earlier death estimate</a>, <a href="https://www.bmj.com/content/381/bmj.p1082" target="_blank" rel="noreferrer">The BMJ's report on the Jos case</a>, and <a href="https://www.vanguardngr.com/2026/06/cosmetics-food-beverages-account-for-50-per-cent-of-counterfeits-products-nafdac/" target="_blank" rel="noreferrer">coverage of NAFDAC's 2026 briefing</a>.
              </p>
            </details>
          </div>
        </div>
      </section>

      <section className="about-story-origin" aria-labelledby="about-origin-heading">
        <div className="about-story-inner about-story-split">
          <figure className="about-story-photo">
            <img
              src="/images/second-section-img.webp"
              alt="Product safety workers examining packaged goods"
              loading="lazy"
            />
          </figure>
          <div className="about-story-prose">
            <span className="about-story-kicker">WHY WE STARTED</span>
            <h2 id="about-origin-heading">We asked a question.</h2>
            <p>
              We kept asking the same questions. How can an ordinary consumer actually make sense of a registry label? How do you catch a cloned product when the fake carries the exact same registration number as the real thing? And how do manufacturers protect a brand they spent years building, when a copy of their own label is all it takes to steal their customers' trust?
            </p>
            <strong>
              Then we came up with GenuineNG, a digital platform that lets anyone scan a product and get an instant, honest answer about what's real and what isn't, while giving manufacturers a way to keep it real.
            </strong>
          </div>
        </div>
      </section>

      <TwoWaysToCheck navigate={navigate} />

      <section className="about-story-journey" aria-labelledby="about-layer-one-heading">
        <div className="about-story-inner">
          <div className="about-story-section-heading">
            <span className="about-story-kicker">HOW IT WORKS · LAYER 1</span>
            <h2 id="about-layer-one-heading">Check the printed label.</h2>
            <p>A free check for everyday products, from a photo to an honest result.</p>
          </div>
          <ol className="about-story-timeline">
            {layerOneSteps.map((step, index) => (
              <li key={step.title}>
                <span className="about-story-timeline-dot" aria-hidden="true" />
                <div className="about-story-timeline-content">
                  <span className="about-story-step-icon"><Icon name={step.icon} size={23} /></span>
                  <span className="about-story-step-number">STEP {String(index + 1).padStart(2, "0")}</span>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="about-story-journey about-story-code-flow" aria-labelledby="about-layer-two-heading">
        <div className="about-story-inner">
          <div className="about-story-section-heading">
            <span className="about-story-kicker">HOW IT WORKS · LAYER 2</span>
            <h2 id="about-layer-two-heading">Verify a GenuineNG Code.</h2>
            <p>A unique signed code for each unit from an approved manufacturer partner.</p>
          </div>
          <ol className="about-story-timeline">
            {layerTwoSteps.map((step, index) => (
              <li key={step.title}>
                <span className="about-story-timeline-dot" aria-hidden="true" />
                <div className="about-story-timeline-content">
                  <span className="about-story-step-icon"><Icon name={step.icon} size={23} /></span>
                  <span className="about-story-step-number">STEP {String(index + 1).padStart(2, "0")}</span>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="about-story-values" aria-labelledby="about-values-heading">
        <div className="about-story-inner">
          <div className="about-story-section-heading">
            <span className="about-story-kicker">WHO IT HELPS</span>
            <h2 id="about-values-heading">Better checks for both sides.</h2>
            <p>Useful signals for shoppers and a clearer way for brands to protect their products.</p>
          </div>
          <div className="about-story-values-grid">
            {benefits.map((group) => (
              <div className="about-story-value" key={group.title}>
                <span className="about-story-value-icon"><Icon name={group.icon} size={22} /></span>
                <h3>{group.title}</h3>
                <ul>
                  {group.points.map((point) => <li key={point}>{point}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <WhatWeStandFor />

      <section className="about-story-cta" aria-labelledby="about-cta-heading">
        <div className="about-story-inner">
          <span className="about-story-kicker">START WITH A CHECK</span>
          <h2 id="about-cta-heading">Know more about what you are holding.</h2>
          <p>Start with a free label check on the main page.</p>
          <div className="about-story-actions">
            <button type="button" className="button primary" onClick={() => navigate("/#scan-workspace")}> 
              Start checking <Icon name="arrow" size={16} />
            </button>
          </div>
          <div className="about-story-policy-links">
            <button type="button" className="about-story-privacy" onClick={() => navigate("/privacy")}> 
              Privacy Policy <Icon name="arrow" size={15} />
            </button>
            <button type="button" className="about-story-privacy" onClick={() => navigate("/terms")}> 
              Terms of Service <Icon name="arrow" size={15} />
            </button>
          </div>
        </div>
      </section>
    </article>
  );
}
