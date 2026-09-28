import CodeScanFlow from '../components/CodeScanFlow';

export default function Layer2ScanPage({ previousScans = [], onResultComplete, mode = 'guest' }) {
  return (
    <section className="layer2-public-page">
      <CodeScanFlow
        previousScans={previousScans}
        onResultComplete={onResultComplete}
        mode={mode}
      />
    </section>
  );
}
