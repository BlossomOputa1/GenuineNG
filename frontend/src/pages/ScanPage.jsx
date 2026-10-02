import { useEffect, useRef, useState } from "react";
import CheckModeSwitch from "../components/CheckModeSwitch";
import CodeScanFlow from "../components/CodeScanFlow";
import Hero from "../components/Hero";
import ScanCameraView from "../components/ScanCameraView";
import { TwoWaysToCheck, WhatWeStandFor } from "../components/StorySections";
import WhyGenuineNG from "../components/WhyGenuineNG";

export default function ScanPage({ navigate, onBeginScan, session }) {
  const heading = useRef(null);
  const [checkMode, setCheckMode] = useState("registry");

  useEffect(() => {
    if (window.location.hash !== "#scan-workspace") return undefined;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("scan-workspace")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function beginWithPhoto(file) {
    onBeginScan(file);
  }

  return (
    <>
      <Hero
        headingRef={heading}
        navigate={navigate}
        onStart={() =>
          document.getElementById("scan-workspace")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          })
        }
        session={session}
      />

      <WhyGenuineNG navigate={navigate} />
      <TwoWaysToCheck navigate={navigate} onMain />

      <section
        className="public-scan-workspace"
        id="scan-workspace"
        aria-label="Product check"
      >
        <CheckModeSwitch value={checkMode} onChange={setCheckMode} />

        <div className="public-scan-mode-panel">
          {checkMode === "registry" ? (
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
      <WhatWeStandFor onMain />
    </>
  );
}
