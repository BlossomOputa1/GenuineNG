import { useState } from "react";
import Icon from "../components/Icon";
import ContactForm, { SUPPORT_EMAIL } from "../components/ContactForm";

export default function ContactPage() {
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="partner-application-page contact-page">
      <div className="partner-application-copy">
        <span className="eyebrow">CONTACT</span>
        <h1>Talk to the GenuineNG team.</h1>
        <p>
          Have a questions about an account, a scan result, or becoming a
          manufacturer partner? Send us a message.
        </p>
        <div className="contact-email-card">
          <span className="contact-email-icon">
            <Icon name="mail" size={20} />
          </span>
          <div>
            <strong>{SUPPORT_EMAIL}</strong>
            <small>We usually reply within 2 business days.</small>
          </div>
        </div>
        <div className="contact-card-actions">
          <a className="button secondary" href={`mailto:${SUPPORT_EMAIL}`}>
            Email us directly
          </a>
          <button type="button" className="button secondary" onClick={copyEmail}>
            <Icon name="copy" size={16} /> {copied ? "Copied" : "Copy email"}
          </button>
        </div>
      </div>
      <div className="partner-application-card contact-card">
        <ContactForm />
      </div>
    </section>
  );
}
