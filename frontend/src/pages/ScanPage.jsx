import { useRef, useState } from 'react';
import Hero from '../components/Hero';
import ScanCameraView from '../components/ScanCameraView';
import WhyGenuineNG from '../components/WhyGenuineNG';
import CodeScanFlow from '../components/CodeScanFlow';
import CheckModeSwitch from '../components/CheckModeSwitch';

export default function ScanPage({ navigate, onBeginScan }) {
  const heading = useRef(null);
  const [checkMode, setCheckMode] = useState('registry');

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

      <section className="public-scan-workspace" id="scan-workspace" aria-label="Product check">
        <CheckModeSwitch value={checkMode} onChange={setCheckMode} />

        <div className="public-scan-mode-panel">
          {checkMode === 'registry' ? (
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
          ) : (
            <CodeScanFlow />
          )}
        </div>
      </section>
    </>
  );
}
