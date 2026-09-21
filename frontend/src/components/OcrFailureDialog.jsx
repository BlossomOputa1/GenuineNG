import Icon from './Icon';

export default function OcrFailureDialog({ open, onRetake, onManual, onClose, message = "We couldn't read this label. Please enter the details manually." }) {
  if (!open) return null;
  return (
    <div className="gn-modal-backdrop" role="presentation">
      <section className="gn-modal compact-error-modal" role="dialog" aria-modal="true" aria-labelledby="ocr-failure-title">
        <button type="button" className="gn-modal-close" onClick={onClose} aria-label="Close and return to scan page">
          <Icon name="close" size={18} />
        </button>
        <span className="gn-modal-icon"><Icon name="warning" size={28} /></span>
        <h2 id="ocr-failure-title">Couldn’t capture details.</h2>
        <p className="ocr-failure-message">{message}</p>
        <div className="gn-modal-actions">
          <button type="button" className="button primary" onClick={onRetake}>
            <Icon name="camera" size={17} /> Scan again
          </button>
          <button type="button" className="button secondary" onClick={onManual}>
            Enter info
          </button>
        </div>
      </section>
    </div>
  );
}
