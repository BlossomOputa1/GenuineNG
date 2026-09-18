import DemoScanFlow from '../components/DemoScanFlow';

export default function GuestScanPage({
  initialPhotoFile,
  previousScans,
  onResultComplete,
  navigate
}) {
  return (
    <div className="guest-scan-page">
      <div className="guest-scan-banner">
        <span>Guest check</span>
        <p>This session is temporary. Leave this page and the demo scan history is cleared.</p>
      </div>
      <DemoScanFlow
        initialPhotoFile={initialPhotoFile}
        previousScans={previousScans}
        onResultComplete={onResultComplete}
        mode="guest"
        onLeave={() => navigate('/')}
      />
    </div>
  );
}
