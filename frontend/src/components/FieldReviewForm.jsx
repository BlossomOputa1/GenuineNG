import Icon from './Icon';

const fieldLabels = [
  ['productName', 'Product name / variant', 200, true],
  ['manufacturer', 'Manufacturer', 300, true],
  ['registrationNumber', 'NAFDAC registration number', 80, true],
  ['batchNumber', 'Batch / lot number', 80, false],
  ['expiryDate', 'Expiry date', 80, false],
];

export default function FieldReviewForm({
  fields,
  onChange,
  onSubmit,
  busy,
  notice,
  submitLabel = 'Continue to check',
  error = '',
  savedEdit = false,
}) {
  return (
    <form className="review-form" onSubmit={event => { event.preventDefault(); onSubmit(); }} aria-busy={busy} noValidate>
      <div className="panel-heading"><span className="eyebrow">REVIEW THE PRINTED DETAILS</span></div>
      <div className="review-intro">
        <h2>{savedEdit ? 'Update the saved details.' : 'Enter the details we need.'}</h2>
      </div>
      {notice && <div className="inline-notice" role="status"><Icon name="info" /><p>{notice}</p></div>}
      {error && <div className="inline-notice form-error" role="alert"><Icon name="warning" /><p>{error}</p></div>}
      <div className="field-grid">
        {fieldLabels.map(([name, label, maxLength, required]) => (
          <div className={`field ${name === 'productName' || name === 'manufacturer' ? 'field-wide' : ''}`} key={name}>
            <label htmlFor={name}>{label}{required ? <span className="required-mark">Required</span> : <span className="optional-mark">Optional</span>}</label>
            <input
              id={name}
              name={name}
              className={['registrationNumber', 'batchNumber', 'expiryDate'].includes(name) ? 'mono' : ''}
              value={fields[name] || ''}
              onChange={event => onChange(name, event.target.value)}
              disabled={busy}
              maxLength={maxLength}
              aria-required={required}
              placeholder={required ? 'Required' : 'Optional'}
              autoComplete="off"
              spellCheck={!['registrationNumber', 'batchNumber', 'expiryDate'].includes(name)}
            />
          </div>
        ))}
        <div className="field field-wide">
          <label htmlFor="ingredients">Ingredients <span className="optional-mark">Optional</span></label>
          <textarea id="ingredients" name="ingredients" rows="4" maxLength="3000" value={fields.ingredients || ''} onChange={event => onChange('ingredients', event.target.value)} disabled={busy} placeholder="Optional" />
        </div>
      </div>
      <div className="review-footer">
        <div className="button-row">
          <button type="submit" className="button primary" disabled={busy}>{busy ? 'Checking available records…' : submitLabel}{!busy && <Icon name="arrow" />}</button>
        </div>
      </div>
    </form>
  );
}
