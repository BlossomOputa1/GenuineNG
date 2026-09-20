import Icon from './Icon';

const fieldLabels = [
  ['productName', 'Product name / variant', 200, true, 'Enter product name'],
  ['manufacturer', 'Manufacturer', 300, true, 'Enter manufacturer'],
  ['registrationNumber', 'NAFDAC registration number', 80, true, 'Enter NAFDAC number'],
  ['expiryDate', 'Expiry date', 80, false, 'Optional — e.g. 12/2027'],
];

export default function FieldReviewForm({
  fields,
  onChange,
  onSubmit,
  onCancel,
  busy,
  notice,
  submitLabel = 'Continue',
  error = '',
  savedEdit = false,
  compact = false,
}) {
  return (
    <form className={`review-form ${compact ? 'review-form-compact' : ''}`} onSubmit={event => { event.preventDefault(); onSubmit(); }} aria-busy={busy} noValidate>
      <div className="panel-heading"><span className="eyebrow">CONFIRM THE DETAILS</span></div>
      <div className="review-intro">
        <h2>{savedEdit ? 'Update the saved details.' : 'Check what we captured.'}</h2>
      </div>
      {notice && <div className="inline-notice" role="status"><Icon name="info" /><p>{notice}</p></div>}
      {error && <div className="inline-notice form-error" role="alert"><Icon name="warning" /><p>{error}</p></div>}
      <div className="field-grid">
        {fieldLabels.map(([name, label, maxLength, required, placeholder]) => (
          <div className={`field ${name === 'productName' || name === 'manufacturer' ? 'field-wide' : ''}`} key={name}>
            <label htmlFor={name}>{label}{required ? <span className="required-mark">Required</span> : <span className="optional-mark">Optional</span>}</label>
            <input
              id={name}
              name={name}
              className={['registrationNumber', 'expiryDate'].includes(name) ? 'mono' : ''}
              value={fields[name] || ''}
              onChange={event => onChange(name, event.target.value)}
              disabled={busy}
              maxLength={maxLength}
              aria-required={required}
              placeholder={placeholder}
              autoComplete="off"
              spellCheck={!['registrationNumber', 'expiryDate'].includes(name)}
            />
          </div>
        ))}
      </div>
      <div className="review-footer">
        <div className="button-row">
          {onCancel && <button type="button" className="button secondary" onClick={onCancel} disabled={busy}>Cancel</button>}
          <button type="submit" className="button primary" disabled={busy}>{busy ? 'Checking available records…' : submitLabel}{!busy && <Icon name="arrow" />}</button>
        </div>
      </div>
    </form>
  );
}
