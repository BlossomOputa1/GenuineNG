import Icon from "../components/Icon";

const topics = [
  { id: "start", label: "Get started" },
  { id: "label-check", label: "Label check" },
  { id: "results", label: "Results" },
  { id: "code-check", label: "GenuineNG Code" },
  { id: "accounts", label: "Accounts" },
  { id: "history", label: "History" },
  { id: "manufacturers", label: "Manufacturers" },
  { id: "troubleshooting", label: "Troubleshooting" },
  { id: "safety", label: "Safety" },
];

const labelSteps = [
  {
    icon: "camera",
    title: "Capture the label",
    text: "Use Snap to open your camera, or Upload to choose a JPG, PNG, or WebP photo under 12 MB. You can add a second photo of the other side of the pack.",
  },
  {
    icon: "scan",
    title: "Read the details",
    text: "GenuineNG reads the product name, manufacturer, NAFDAC registration number, and expiry date from the photos.",
  },
  {
    icon: "edit",
    title: "Review and correct",
    text: "Confirm the extracted fields before checking. Partial information is fine; we check only what the label supports.",
  },
  {
    icon: "check",
    title: "Understand the result",
    text: "We compare available registration details and check the expiry date, then separate matches, warnings, and unknowns.",
  },
];

const resultTypes = [
  { icon: "check", title: "Matched", text: "A detail lined up with an available record. A match alone does not prove that the unit is genuine." },
  { icon: "warning", title: "Warning", text: "A detail needs attention, such as an expired date, a missing number, or unclear text." },
  { icon: "info", title: "Unverified", text: "There was not enough reliable information to complete this check. It is neither a pass nor a fail." },
  { icon: "minus", title: "Not checked", text: "The check was skipped because the needed field was not provided." },
];

const issues = [
  { title: "My camera will not open", text: "Allow camera access in your browser settings, then close any other app using the camera. You can also upload a photo instead." },
  { title: "The label text will not read", text: "Retake the photo in good light with less glare. Keep the whole label in frame, or correct the details in the review step." },
  { title: "My photo was rejected", text: "Use a JPG, PNG, or WebP image under 12 MB. Convert HEIC photos to JPG first." },
  { title: "The service says unavailable or offline", text: "Live checks and history saving need a connection. Wait for the connection banner to clear, then try again." },
  { title: "I did not receive an approval email", text: "Check spam, make sure your business email matches your account email, and check notifications in your checkspace." },
];

export default function HelpPage({ navigate }) {
  return (
    <article className="help-story-page">
      <section className="help-story-hero" aria-labelledby="help-heading">
        <div className="about-story-inner">
          <span className="about-story-kicker">GENUINENG HELP CENTER</span>
          <h1 id="help-heading">A clearer way <span>to check.</span></h1>
          <p>From your first label photo to understanding a result, here is how each part of GenuineNG works.</p>
          <button type="button" className="button primary" onClick={() => navigate("/#scan-workspace")}>Start checking <Icon name="arrow" size={16} /></button>
        </div>
      </section>

      <nav className="help-story-topics" aria-label="Help topics">
        <div className="about-story-inner">
          {topics.map((topic) => <a key={topic.id} href={`#${topic.id}`}>{topic.label}</a>)}
        </div>
      </nav>

      <section className="help-story-section help-story-start" id="start" aria-labelledby="help-start-heading">
        <div className="about-story-inner help-story-split">
          <div className="help-story-copy">
            <span className="about-story-kicker">01 / GETTING STARTED</span>
            <h2 id="help-start-heading">Check as a guest. Save with an account.</h2>
            <p>From the main page, choose Registry label check or GenuineNG Code. You can check a product without signing in. Create a free account when you want to keep your checks in Checkspace.</p>
            <button type="button" className="help-story-link" onClick={() => navigate("/#scan-workspace")}>Go to the checks <Icon name="arrow" size={17} /></button>
          </div>
          <div className="help-story-choice-grid" aria-label="Ways to get started">
            <div className="help-story-choice-card">
              <span className="help-story-icon"><Icon name="scan" size={25} /></span>
              <small>QUICK CHECK</small>
              <h3>Continue as a guest</h3>
              <p>Complete a check without an account. Guest results are not saved to Checkspace.</p>
            </div>
            <div className="help-story-choice-card">
              <span className="help-story-icon"><Icon name="history" size={25} /></span>
              <small>YOUR CHECKSPACE</small>
              <h3>Sign in to save</h3>
              <p>Keep your results, organize sessions, and access partner features if approved.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="help-story-section help-story-label" id="label-check" aria-labelledby="help-label-heading">
        <div className="about-story-inner">
          <div className="help-story-heading">
            <span className="about-story-kicker">02 / REGISTRY LABEL CHECK</span>
            <h2 id="help-label-heading">From photo to a useful answer.</h2>
            <p>Four simple steps. Review the label details before any check runs.</p>
          </div>
          <div className="help-story-steps">
            {labelSteps.map((step, index) => (
              <div className="help-story-step" key={step.title}>
                <span className="help-story-step-count">0{index + 1}</span>
                <span className="help-story-icon"><Icon name={step.icon} size={23} /></span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
          <div className="help-story-app-preview" aria-label="Illustration of the label capture screen">
            <span className="help-story-preview-caption">IN THE APP / LABEL CAPTURE</span>
            <div className="help-story-preview-tabs"><strong>Scan registry label</strong><span>Scan GenuineNG code</span></div>
            <div className="help-story-preview-viewfinder">
              <Icon name="scan" size={38} />
              <strong>Start with the front label.</strong>
              <p>Snap or upload the front of the product. We’ll ask for the back image next.</p>
            </div>
            <div className="help-story-preview-actions"><span><Icon name="camera" size={17} /> Open camera</span><span><Icon name="upload" size={17} /> Upload a photo</span></div>
          </div>
          <p className="help-story-tip"><Icon name="info" size={19} /> <span><strong>Photo tip:</strong> Lay the pack flat in good light, fill the frame with the label, and avoid shadows or glare. Convert HEIC photos to JPG before uploading.</span></p>
        </div>
      </section>

      <section className="help-story-section help-story-results" id="results" aria-labelledby="help-results-heading">
        <div className="about-story-inner">
          <div className="help-story-heading">
            <span className="about-story-kicker">03 / READING RESULTS</span>
            <h2 id="help-results-heading">Know what the result really says.</h2>
            <p>Each detail gets its own status, so you can see what was found and what still needs a closer look.</p>
          </div>
          <div className="help-story-result-grid">
            {resultTypes.map((item) => (
              <div className="help-story-result-card" key={item.title}>
                <span className="help-story-icon"><Icon name={item.icon} size={23} /></span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
          <p className="help-story-caveat">A GenuineNG label check is not NAFDAC certification or proof that a product is genuine or fake. If you doubt a product, do not use it.</p>
        </div>
      </section>

      <section className="help-story-section help-story-code" id="code-check" aria-labelledby="help-code-heading">
        <div className="about-story-inner help-story-split">
          <div className="help-story-copy">
            <span className="about-story-kicker">04 / GENUINENG CODE</span>
            <h2 id="help-code-heading">One code for one unit.</h2>
            <p>Switch to GenuineNG Code on the main page. Peel the seal after purchase and scan the partner product’s QR code. The first valid check marks that individual code as used. Signed-in users can save results to history.</p>
            <button type="button" className="help-story-link" onClick={() => navigate("/#scan-workspace")}>Try a code scan <Icon name="arrow" size={17} /></button>
          </div>
          <div className="help-story-code-panel" aria-label="Possible code scan signals">
            <span className="help-story-code-mark"><Icon name="qr" size={52} /></span>
            <strong>What the scan can show</strong>
            <ul>
              <li><span>Genuine</span><small>This code is valid and has now been marked as used.</small></li>
              <li><span>Already scanned</span><small>Ask the seller for an unopened product.</small></li>
              <li><span>Not Genuine</span><small>The code could not be confirmed or has been deactivated.</small></li>
            </ul>
          </div>
        </div>
      </section>

      <section className="help-story-section help-story-account" id="accounts" aria-labelledby="help-accounts-heading">
        <div className="about-story-inner">
          <div className="help-story-heading">
            <span className="about-story-kicker">05 / ACCOUNTS</span>
            <h2 id="help-accounts-heading">Your checks, when you need them.</h2>
          </div>
          <div className="help-story-account-grid">
            <div><span className="help-story-icon"><Icon name="users" size={22} /></span><h3>Create an account</h3><p>Open Sign in, choose Create account, then enter your name, email, and a password of at least eight characters. Confirm your email if asked.</p></div>
            <div><span className="help-story-icon"><Icon name="lock" size={22} /></span><h3>Sign in or reset</h3><p>Use your email and password or Continue with Google. For a forgotten password, use the reset link on the sign-in page.</p></div>
            <div><span className="help-story-icon"><Icon name="logout" size={22} /></span><h3>Sign out on shared devices</h3><p>Use Sign out in your Checkspace menu when you are finished, especially on a phone or computer others use.</p></div>
          </div>
        </div>
      </section>

      <section className="help-story-section help-story-history" id="history" aria-labelledby="help-history-heading">
        <div className="about-story-inner help-story-split">
          <div className="help-story-copy">
            <span className="about-story-kicker">06 / CHECKSPACE HISTORY</span>
            <h2 id="help-history-heading">Keep the checks that matter.</h2>
            <p>Signed-in checks are grouped into sessions in your Checkspace sidebar. Registry label checks and GenuineNG Code scans live in separate sessions.</p>
          </div>
          <div className="help-story-history-list">
            <p><Icon name="eye" size={19} /> Reopen a session to revisit saved results.</p>
            <p><Icon name="edit" size={19} /> Rename sessions so you remember what they contain.</p>
            <p><Icon name="pin" size={19} /> Pin important sessions to the top.</p>
            <p><Icon name="trash" size={19} /> Delete a session and its scans when you no longer need it.</p>
          </div>
        </div>
      </section>

      <section className="help-story-section help-story-makers" id="manufacturers" aria-labelledby="help-makers-heading">
        <div className="about-story-inner">
          <div className="help-story-heading">
            <span className="about-story-kicker">07 / MANUFACTURER PORTAL</span>
            <h2 id="help-makers-heading">Protect the products you make.</h2>
            <p>Partner companies can issue signed codes for product units and see scan activity.</p>
          </div>
          <div className="help-story-maker-grid">
            <div><span>01</span><h3>Apply</h3><p>Submit your company and contact details on the Partners page. Use the same business email for your GenuineNG account.</p></div>
            <div><span>02</span><h3>Get approved</h3><p>Applications are reviewed manually. Watch for an approval email and an in-app notification.</p></div>
            <div><span>03</span><h3>Manage units</h3><p>Register products and batches, generate signed QR codes, export production files, and review scan activity.</p></div>
          </div>
          <button type="button" className="button primary" onClick={() => navigate("/partners")}>Explore partnerships <Icon name="arrow" size={16} /></button>
        </div>
      </section>

      <section className="help-story-section help-story-fixes" id="troubleshooting" aria-labelledby="help-fix-heading">
        <div className="about-story-inner help-story-split">
          <div className="help-story-copy">
            <span className="about-story-kicker">08 / TROUBLESHOOTING</span>
            <h2 id="help-fix-heading">Something not working?</h2>
            <p>Start with these common fixes. If you are still stuck, send us a message.</p>
            <button type="button" className="help-story-link" onClick={() => navigate("/contact")}>Contact us <Icon name="arrow" size={17} /></button>
          </div>
          <div className="help-story-questions">
            {issues.map((issue) => <details key={issue.title}><summary>{issue.title}</summary><p>{issue.text}</p></details>)}
          </div>
        </div>
      </section>

      <section className="help-story-section help-story-safety" id="safety" aria-labelledby="help-safety-heading">
        <div className="about-story-inner">
          <span className="about-story-kicker">09 / SAFETY AND PRIVACY</span>
          <h2 id="help-safety-heading">Check carefully. Stay private.</h2>
          <p>Counterfeit products can copy real-looking label details. If you doubt a product, do not use it; ask a pharmacist, the manufacturer, or NAFDAC. Guest checks are not saved, and signed-in history is visible only to you. You can request deletion at contact.genuineng@gmail.com.</p>
          <div className="help-story-footer-links">
            <button type="button" onClick={() => navigate("/privacy")}>Privacy Policy <Icon name="arrow" size={16} /></button>
            <button type="button" onClick={() => navigate("/terms")}>Terms of Service <Icon name="arrow" size={16} /></button>
            <button type="button" onClick={() => navigate("/contact")}>Contact us <Icon name="arrow" size={16} /></button>
          </div>
        </div>
      </section>
    </article>
  );
}
