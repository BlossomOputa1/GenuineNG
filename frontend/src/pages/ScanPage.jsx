import { useRef } from 'react';
import Hero from '../components/Hero';
import Icon from '../components/Icon';
import ScanCameraView from '../components/ScanCameraView';
import WhyGenuineNG from '../components/WhyGenuineNG';

export default function ScanPage({ navigate, onBeginScan }) {
  const heading = useRef(null);

  function beginWithPhoto(file) {
    onBeginScan(file);
  }

  return (
    <>
      <Hero
        headingRef={heading}
        navigate={navigate}
        onStart={() =>
          document.getElementById('scan-workspace')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          })
        }
      />

      <WhyGenuineNG navigate={navigate} />

      <ol className="step-list" aria-label="How a product check works">
        <li className="current">
          <span className="step-number">01</span>
          Add both sides
        </li>
        <li>
          <span className="step-number">02</span>
          Review details
        </li>
        <li>
          <span className="step-number">03</span>
          See checks
        </li>
      </ol>

      <div className="workspace-grid" id="scan-workspace">
        <div className="main-column">
          <ScanCameraView
            photos={[]}
            onPhoto={beginWithPhoto}
            onRemove={() => {}}
            onRead={() => {}}
            busy={false}
            error=""
            progress={null}
            onCancel={() => {}}
            launcherMode
          />
        </div>

        <aside className="scan-aside" aria-label="Label check help">
          <details className="scan-help-card">
            <summary>What can a label check tell me?</summary>
            <div className="scan-help-content">
              <p>
                GenuineNG reads printed label details and checks the information
                that is available to it. It cannot inspect what is inside a sealed
                product or prove that packaging has not been copied.
              </p>
            </div>
          </details>

          <details className="scan-help-card">
            <summary>Scan help</summary>
            <div className="scan-help-content guidance-dropdown-content">
              <h2>Get the print in focus.</h2>
              <ol className="guidance-list">
                <li>
                  <span className="guidance-number">01</span>
                  <div>
                    <strong>Find the printed details</strong>
                    <p>Look for the manufacturer, NAFDAC number, batch, expiry and ingredients.</p>
                  </div>
                </li>
                <li>
                  <span className="guidance-number">02</span>
                  <div>
                    <strong>Give the text some light</strong>
                    <p>Hold steady. Avoid glare, and move close enough for the small print.</p>
                  </div>
                </li>
                <li>
                  <span className="guidance-number">03</span>
                  <div>
                    <strong>Both sides are required in this prototype</strong>
                    <p>Start with the front, then add a back image on the dedicated scan page.</p>
                  </div>
                </li>
              </ol>
              <div className="honesty-note">
                <div className="honesty-heading">
                  <Icon name="info" size={18} />
                  <h3>A check, with clear limits.</h3>
                </div>
                <p>A real registration number can be copied. These checks cannot prove what’s inside a sealed pack.</p>
              </div>
            </div>
          </details>
        </aside>
      </div>
    </>
  );
}
