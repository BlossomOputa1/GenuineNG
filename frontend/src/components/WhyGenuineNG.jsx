import Icon from './Icon';

const reasonStats = [
  {
    value: '13–15%',
    label: 'Medicines NAFDAC estimates are fake'
  },
  {
    value: '70%',
    label: 'Higher estimate reported by another health agency'
  },
  {
    value: '50%+',
    label: 'Seized fakes linked to cosmetics, food and drinks'
  }
];

export default function WhyGenuineNG({ navigate }) {
  function goToContact(event) {
    event.preventDefault();
    navigate('/contact');
  }

  return (
    <section className="reason-section" aria-labelledby="reason-heading">
      <div className="reason-top">
        <div className="reason-heading-block">
          <span className="reason-tag">REASON FOR GENUINENG</span>
          <h2 id="reason-heading">Fake products shouldn&apos;t pass unnoticed.</h2>
        </div>

        <div className="reason-copy-block">
          <p>
            Fake products are a serious problem in Nigeria, and consumers often
            have no quick way to know if what they are buying is trustworthy.
            NAFDAC estimates <strong>13–15% of medicines in circulation are fake</strong>,
            while other estimates are much higher. Counterfeiters have found smart
            ways to circulate fake products without customer knowledge.
          </p>

          <p>
            GenuineNG helps close that gap by letting users quickly check product
            details like registration numbers, expiry dates, ingredients, and recalls.
            For partnered manufacturers, GenuineNG can also use unique codes for
            stronger product verification. <strong>GenuineNG exists to make product
            checking simple and make counterfeit products harder to pass unnoticed.</strong>
          </p>

          <a className="reason-contact-button" href="/contact" onClick={goToContact}>
            Contact us
            <span className="reason-contact-icon">
              <Icon name="arrow" size={15} />
            </span>
          </a>
        </div>
      </div>

      <div className="reason-media-grid">
        <div className="reason-image-wrap">
          <img src="/images/second-section-img.webp" alt="" />
        </div>

        <div className="reason-stats" aria-label="Counterfeit product statistics">
          {reasonStats.map(stat => (
            <div className="reason-stat-card" key={stat.value}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
