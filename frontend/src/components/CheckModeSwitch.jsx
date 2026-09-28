export default function CheckModeSwitch({ value, onChange, locked = false }) {
  return (
    <div className="workspace-mode-switch-wrap">
      <div className={`workspace-mode-switch ${locked ? "locked" : ""}`} role="tablist" aria-label="Check mode" aria-disabled={locked}>
        <button
          type="button"
          className={`workspace-mode-pill ${value === 'registry' ? 'active' : ''}`}
          role="tab"
          aria-selected={value === 'registry'}
          onClick={() => onChange('registry')}
          disabled={locked}
        >
          Scan registry label
        </button>
        <button
          type="button"
          className={`workspace-mode-pill ${value === 'code' ? 'active' : ''}`}
          role="tab"
          aria-selected={value === 'code'}
          onClick={() => onChange('code')}
          disabled={locked}
        >
          Scan GenuineNG code
        </button>
      </div>
    </div>
  );
}
