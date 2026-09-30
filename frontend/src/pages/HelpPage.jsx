import Icon from "../components/Icon";

const sections = [
  { id: "start", label: "Getting started" },
  { id: "label-check", label: "Registry label check" },
  { id: "results", label: "Reading results" },
  { id: "code-check", label: "GenuineNG Code scan" },
  { id: "accounts", label: "Accounts and sign in" },
  { id: "history", label: "Workspace history" },
  { id: "manufacturers", label: "Manufacturer portal" },
  { id: "troubleshooting", label: "Troubleshooting" },
  { id: "safety", label: "Safety and privacy" },
];

export default function HelpPage({ navigate }) {
  return (
    <div className="about-page help-page">
      <section className="about-hero" aria-labelledby="help-heading">
        <span className="eyebrow">HELP CENTER</span>
        <h1 id="help-heading">How to use GenuineNG.</h1>
        <p className="about-lead">
          Everything below matches what you see in the app today. Start with a
          guest check, create an account to save history, or apply as a
          manufacturer partner when you are ready.
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
        </div>
      </section>

      <div className="help-layout">
        <nav className="help-toc" aria-label="Help topics">
          <strong>On this page</strong>
          <ol>
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>{section.label}</a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="help-docs">
          <section id="start" aria-labelledby="help-start-heading">
            <span className="reason-tag">GETTING STARTED</span>
            <h2 id="help-start-heading">Guest or account. Your choice.</h2>
            <p>
              From the main page, choose a check mode and take or upload a
              photo. Guests can complete a full check without signing in, and
              nothing is saved. Create a free account from Sign in to save
              checks to your workspace, pin sessions, and apply as a
              manufacturer.
            </p>
            <ul>
              <li>No account needed for a one off product check.</li>
              <li>Sign in with email and password, or with Google.</li>
              <li>Your workspace, history, and portal access need an account.</li>
            </ul>
          </section>

          <section id="label-check" aria-labelledby="help-label-heading">
            <span className="reason-tag">REGISTRY LABEL CHECK</span>
            <h2 id="help-label-heading">Check a printed label in 4 steps.</h2>
            <ol>
              <li>
                <strong>Capture the label.</strong> Use Snap to open your
                camera, or Upload to pick a JPG, PNG, or WebP photo under
                12 MB. You can add a second photo for the other side of the
                pack.
              </li>
              <li>
                <strong>Read the text.</strong> GenuineNG extracts the product
                name, manufacturer, NAFDAC registration number, and expiry
                date on your device and backend.
              </li>
              <li>
                <strong>Review before verifying.</strong> Confirm or correct
                each field in the review dialog. Partial information is valid.
                GenuineNG checks only what the label supports.
              </li>
              <li>
                <strong>Run verification.</strong> We compare the registration
                number with available records and validate the expiry date,
                then show the result with copy and listen options.
              </li>
            </ol>
            <p>
              Photo tips. Lay the pack flat in good light, fill the frame with
              the label, avoid glare and shadows, and hold the camera steady.
              If your phone saves HEIC photos, take a new photo here or convert
              it to JPG first.
            </p>
          </section>

          <section id="results" aria-labelledby="help-results-heading">
            <span className="reason-tag">READING RESULTS</span>
            <h2 id="help-results-heading">What each status means.</h2>
            <ul>
              <li>
                <strong>Matched.</strong> The detail lined up with the
                available record. Example. The registration number exists and
                the expiry date is valid.
              </li>
              <li>
                <strong>Warning.</strong> Something needs attention. Example.
                The product is expired, the number was not found, or the text
                was unclear. Do not use a product you doubt.
              </li>
              <li>
                <strong>Unverified.</strong> There was not enough reliable
                information to finish that check. It is not a pass or a fail.
              </li>
              <li>
                <strong>Not checked.</strong> That item was skipped because the
                field was missing.
              </li>
            </ul>
            <p>
              Every result states what matched, what raised a warning, and what
              could not be checked. A GenuineNG result is not NAFDAC
              certification and not proof a product is genuine or fake.
            </p>
          </section>

          <section id="code-check" aria-labelledby="help-code-heading">
            <span className="reason-tag">GENUINENG CODE SCAN</span>
            <h2 id="help-code-heading">Scan a partner unit code.</h2>
            <p>
              Switch to GenuineNG Code mode on the main page, point your camera
              at the QR code or upload a clear photo of it. Signed-in users can
              save code scans to history. Results show a Genuine or Not Genuine
              verdict with product, manufacturer, batch, and unit details.
            </p>
            <ul>
              <li>First public scan. The first time that unit is scanned.</li>
              <li>Previously scanned. That unit was scanned before.</li>
              <li>Reuse limit reached. The unit was deactivated for safety.</li>
              <li>Revoked. The unit was already deactivated.</li>
            </ul>
          </section>

          <section id="accounts" aria-labelledby="help-accounts-heading">
            <span className="reason-tag">ACCOUNTS AND SIGN IN</span>
            <h2 id="help-accounts-heading">Create, sign in, reset.</h2>
            <ul>
              <li>
                <strong>Create account.</strong> Open Sign in, switch to Create
                account, enter your full name, email, and a password of at
                least 8 characters. Confirm your email if asked, then sign in.
              </li>
              <li>
                <strong>Sign in.</strong> Use the same email and password, or
                Continue with Google. You stay signed in on your device until
                you sign out.
              </li>
              <li>
                <strong>Forgot password.</strong> Enter your email on the sign
                in page, choose Forgot password, then open the reset link to
                set a new password.
              </li>
              <li>
                <strong>Sign out.</strong> Use Sign out in your workspace menu,
                especially on shared devices.
              </li>
            </ul>
          </section>

          <section id="history" aria-labelledby="help-history-heading">
            <span className="reason-tag">WORKSPACE HISTORY</span>
            <h2 id="help-history-heading">Find every saved check.</h2>
            <p>
              Signed-in checks are grouped into sessions in your workspace
              sidebar. Each session holds one check type only. Registry label
              and GenuineNG Code scans stay in separate sessions.
            </p>
            <ul>
              <li>Open any session to revisit its saved results.</li>
              <li>Rename a session to remember what it was for.</li>
              <li>Pin important sessions to the top of the list.</li>
              <li>Delete a session to remove it and its scans.</li>
            </ul>
          </section>

          <section id="manufacturers" aria-labelledby="help-makers-heading">
            <span className="reason-tag">MANUFACTURER PORTAL</span>
            <h2 id="help-makers-heading">For partner companies.</h2>
            <ol>
              <li>
                <strong>Apply.</strong> Open Partners, submit your company
                name, contact person, business email, and phone number. Use the
                same business email for your GenuineNG account.
              </li>
              <li>
                <strong>Get approved.</strong> Applications are reviewed
                manually. You receive an approval email plus an in-app
                notification.
              </li>
              <li>
                <strong>Manage products.</strong> Register products and
                batches, generate signed unit QR codes, export production
                files, and view scan activity per batch.
              </li>
            </ol>
            <div className="about-hero-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => navigate("/partners")}
              >
                Open Partners page
              </button>
            </div>
          </section>

          <section id="troubleshooting" aria-labelledby="help-fix-heading">
            <span className="reason-tag">TROUBLESHOOTING</span>
            <h2 id="help-fix-heading">Fix common problems.</h2>
            <ul>
              <li>
                <strong>Camera will not open.</strong> Allow camera access for
                GenuineNG in your browser settings and close other apps using
                the camera. On desktop you can use an integrated, USB, or phone
                camera app.
              </li>
              <li>
                <strong>Label text will not read.</strong> Retake the photo
                with better light and less glare, or type the details manually
                when offered. Blurry or cropped text cannot be verified.
              </li>
              <li>
                <strong>Photo rejected.</strong> Use JPG, PNG, or WebP under
                12 MB. Convert HEIC photos first.
              </li>
              <li>
                <strong>Service unavailable or offline.</strong> Live checks
                and history saving need a connection. Wait for the connection
                banner to clear, then try again.
              </li>
              <li>
                <strong>Approval email missing.</strong> Check spam, confirm
                the business email matches your account email, and look for the
                in-app notification bell in your workspace.
              </li>
            </ul>
          </section>

          <section id="safety" aria-labelledby="help-safety-heading">
            <span className="reason-tag">SAFETY AND PRIVACY</span>
            <h2 id="help-safety-heading">Check carefully. Stay private.</h2>
            <p>
              Counterfeit products can copy real-looking details, so treat any
              warning seriously. If you doubt a product, do not use it. Ask a
              pharmacist, the manufacturer, or NAFDAC. Guest checks are not
              saved. Signed-in history is visible only to you, and you can
              request deletion at contact.genuineng@gmail.com.
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
          </section>
        </div>
      </div>
    </div>
  );
}
