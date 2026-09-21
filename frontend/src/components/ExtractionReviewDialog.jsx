import FieldReviewForm from "./FieldReviewForm";
import Icon from "./Icon";

export default function ExtractionReviewDialog({
  open,
  fields,
  onChange,
  onContinue,
  onClose,
  onCancel,
  busy = false,
  error = "",
  savedEdit = false,
}) {
  if (!open) return null;

  const handleClose = onClose || onCancel;

  return (
    <div
      className="gn-modal-backdrop extraction-review-backdrop"
      role="presentation"
    >
      <section
        className="gn-modal extraction-review-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="extraction-review-title"
      >
        {handleClose && (
          <button
            type="button"
            className="gn-modal-close"
            onClick={handleClose}
            aria-label="Close details review"
          >
            <Icon name="close" size={18} />
          </button>
        )}
        <div className="extraction-review-heading">
          <span className="gn-modal-icon">
            <Icon name="scan" size={25} />
          </span>
          <div>
            <span className="eyebrow">LABEL DETAILS</span>
            <h2 id="extraction-review-title">Confirm before we check.</h2>
          </div>
        </div>
        <FieldReviewForm
          fields={fields}
          onChange={onChange}
          onSubmit={onContinue}
          busy={busy}
          error={error}
          savedEdit={savedEdit}
          compact
        />
      </section>
    </div>
  );
}
