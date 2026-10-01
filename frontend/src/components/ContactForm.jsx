import { useState } from "react";
import Icon from "./Icon";

export const SUPPORT_EMAIL = "contact.genuineng@gmail.com";
const topics = [
  "General question",
  "Account help",
  "Scan result question",
  "Manufacturer partnership",
  "Report a problem",
];

export default function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    topic: topics[0],
    message: "",
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function submit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    const name = form.name.trim();
    const email = form.email.trim();
    const message = form.message.trim();
    if (name.length < 2) {
      setError("Please enter your name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (message.length < 10) {
      setError("Please write a message of at least 10 characters.");
      return;
    }
    const subject = encodeURIComponent(`GenuineNG contact — ${form.topic}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nTopic: ${form.topic}\n\n${message}`,
    );
    setNotice("Opening your email app with your message addressed to us.");
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  }

  return (
    <form onSubmit={submit}>
      <h2 id="contact-form-title">Send us a message</h2>
      <label>
        Your name
        <input
          required
          maxLength="120"
          autoComplete="name"
          placeholder="Enter your name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
      </label>
      <label>
        Your email
        <input
          required
          type="email"
          maxLength="254"
          autoComplete="email"
          placeholder="Enter your email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
        />
      </label>
      <label>
        Topic
        <select
          value={form.topic}
          onChange={(event) => setForm({ ...form, topic: event.target.value })}
        >
          {topics.map((topic) => (
            <option key={topic} value={topic}>
              {topic}
            </option>
          ))}
        </select>
      </label>
      <label>
        Message
        <textarea
          required
          rows="4"
          maxLength="2000"
          placeholder="How can we help?"
          value={form.message}
          onChange={(event) =>
            setForm({ ...form, message: event.target.value })
          }
        />
      </label>
      {error && (
        <div className="inline-notice form-error" role="alert">
          <Icon name="warning" size={17} />
          <p>{error}</p>
        </div>
      )}
      {notice && (
        <div className="inline-notice" role="status">
          <Icon name="check" size={17} />
          <p>{notice}</p>
        </div>
      )}
      <button type="submit" className="button primary full-width">
        Open email app <Icon name="arrow" size={16} />
      </button>
    </form>
  );
}
