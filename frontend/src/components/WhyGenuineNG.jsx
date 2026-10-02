import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";

const reasonStats = [
  {
    value: "13–15%",
    targets: [13, 15],
    suffix: "%",
    label: "Medicines NAFDAC estimates are fake",
  },
  {
    value: "70%",
    targets: [70],
    suffix: "%",
    label: "Higher estimate reported by another health agency",
  },
  {
    value: "50%+",
    targets: [50],
    suffix: "%+",
    label: "Seized fakes linked to cosmetics, food and drinks",
  },
];

function formatStat(targets, suffix, progress) {
  return `${targets.map((target) => Math.round(target * progress)).join("–")}${suffix}`;
}

function CountUpStat({ stat }) {
  const cardRef = useRef(null);
  const [display, setDisplay] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    !("IntersectionObserver" in window)
      ? stat.value
      : formatStat(stat.targets, stat.suffix, 0)
  );

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      return undefined;
    }

    let frame;
    let started = false;
    const duration = 1200;
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting || started) return;
      started = true;
      observer.disconnect();
      const start = performance.now();

      function tick(now) {
        const elapsed = Math.min((now - start) / duration, 1);
        const progress = 1 - Math.pow(1 - elapsed, 3);
        setDisplay(formatStat(stat.targets, stat.suffix, progress));
        if (elapsed < 1) frame = window.requestAnimationFrame(tick);
      }

      frame = window.requestAnimationFrame(tick);
    }, { threshold: 0.25, rootMargin: "0px 0px -10% 0px" });

    observer.observe(cardRef.current);
    const stopForReducedMotion = () => {
      if (!reducedMotion.matches) return;
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      setDisplay(stat.value);
    };
    reducedMotion.addEventListener("change", stopForReducedMotion);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      reducedMotion.removeEventListener("change", stopForReducedMotion);
    };
  }, [stat]);

  return (
    <div className="reason-stat-card" ref={cardRef}>
      <strong aria-label={stat.value}><span aria-hidden="true">{display}</span></strong>
      <span>{stat.label}</span>
    </div>
  );
}

export default function WhyGenuineNG({ navigate }) {
  return (
    <section className="reason-section" aria-labelledby="reason-heading">
      <div className="reason-top">
        <div className="reason-heading-block">
          <span className="reason-tag">REASON FOR GENUINENG</span>
          <h2 id="reason-heading">
            Fake products shouldn&apos;t pass unnoticed.
          </h2>
        </div>

        <div className="reason-copy-block">
          <p>
            Fake products are a serious problem in Nigeria, and consumers often
            have no quick way to know if what they are buying is trustworthy.
            NAFDAC estimates{" "}
            <strong>13–15% of medicines in circulation are fake</strong>, while
            other estimates are much higher. Counterfeiters have found smart
            ways to circulate fake products without customer knowledge.
          </p>

          <p>
            GenuineNG helps close that gap by letting users quickly check
            product details like the product name, manufacturer, registration
            number and expiry date. For partnered manufacturers, GenuineNG can
            also use unique codes for stronger product verification.{" "}
            <strong>
              GenuineNG exists to make product checking simple and make
              counterfeit products harder to pass unnoticed.
            </strong>
          </p>

          <button
            type="button"
            className="reason-contact-button"
            onClick={() => navigate("/contact")}
          >
            Contact us
            <span className="reason-contact-icon">
              <Icon name="arrow" size={15} />
            </span>
          </button>
        </div>
      </div>

      <div className="reason-media-grid">
        <div className="reason-image-wrap">
          <img
            src="/images/second-section-img.webp"
            alt=""
            width="960"
            height="640"
            loading="lazy"
          />
        </div>

        <div
          className="reason-stats"
          aria-label="Counterfeit product statistics"
        >
          {reasonStats.map((stat) => <CountUpStat stat={stat} key={stat.value} />)}
        </div>
      </div>
    </section>
  );
}
