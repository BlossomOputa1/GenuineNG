import { useEffect, useState } from 'react';
import Icon from './Icon';

function TypingText({ text, className = '' }) {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (reducedMotion) {
      setDisplayedText(text);
      return undefined;
    }

    let characterIndex = 0;
    let timer;

    const type = () => {
      if (characterIndex <= text.length) {
        setDisplayedText(text.slice(0, characterIndex));
        characterIndex += 1;
        timer = window.setTimeout(type, 115);
        return;
      }

      timer = window.setTimeout(() => {
        setDisplayedText('');
        characterIndex = 0;
        timer = window.setTimeout(type, 420);
      }, 12000);
    };

    type();

    return () => window.clearTimeout(timer);
  }, [text]);

  return (
    <span className={`typing-word ${className}`.trim()}>
      <span className="visually-hidden">{text}</span>
      <span className="typing-reserve" aria-hidden="true">{text}</span>
      <span className="typing-word-visual" aria-hidden="true">
        {displayedText}
        <span className="typing-cursor" />
      </span>
    </span>
  );
}

export default function Hero({ onStart, navigate, headingRef }) {
  function goToLogin(event) {
    event.preventDefault();
    navigate('/login');
  }

  return (
    <section className="hero" aria-labelledby="hero-heading">
      <span className="hero-tag">PRODUCT AUTHENTICITY CHECK</span>

      <h1
        id="hero-heading"
        ref={headingRef}
        tabIndex="-1"
        className="hero-heading"
      >
        <span className="hero-copy-desktop">
          You don&apos;t know if what you buy is real.
          <br />
          With{' '}
          <TypingText
            text="GenuineNG"
            className="hero-accent typing-genuineng"
          />{', you do'}
        </span>

        <span className="hero-copy-mobile">
          Don&apos;t just guess,
          <br />
          <TypingText text="Know" className="hero-accent typing-know" />{" if it's real."}
        </span>
      </h1>

      <p className="hero-sub">
        A scan is all it takes to know your food and drugs are real. Don&apos;t
        ignore what you ingest — let GenuineNG do the test.
      </p>

      <div className="hero-actions">
        <button
          type="button"
          className="hero-button hero-button-primary"
          onClick={onStart}
        >
          Start checking
          <span className="hero-button-icon">
            <Icon name="arrow" size={15} />
          </span>
        </button>

        <a
          href="/login"
          className="hero-button hero-button-secondary"
          onClick={goToLogin}
        >
          Sign in
          <span className="hero-button-icon">
            <Icon name="arrow" size={15} />
          </span>
        </a>
      </div>

      <div className="hero-gallery-shell">
        <div className="hero-gallery-frame">
          <div className="hero-gallery-grid">
            <img src="/images/hero1.jpg" alt="" />
            <img src="/images/hero2.jpg" alt="" />
            <img src="/images/hero3.jpg" alt="" />
            <img src="/images/hero4.jpg" alt="" />
          </div>
        </div>
      </div>
    </section>
  );
}
