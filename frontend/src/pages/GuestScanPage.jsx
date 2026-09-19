import LabelCheckFlow from '../components/LabelCheckFlow';

export default function GuestScanPage({ initialPhotoFile, previousScans, onResultComplete, navigate }) {
  return (
    <div className="guest-scan-page">
      <LabelCheckFlow
        initialPhotoFile={initialPhotoFile}
        previousScans={previousScans}
        onResultComplete={onResultComplete}
        mode="guest"
        onLeave={() => navigate('/')}
      />
    </div>
  );
}
