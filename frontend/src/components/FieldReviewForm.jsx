import Icon from './Icon';
const fieldLabels = [['productName', 'Product name', 'Optional, to help you recognise this check later.', 200], ['manufacturer', 'Manufacturer', 'Use the name printed after “manufactured by”.', 300], ['registrationNumber', 'NAFDAC registration number', 'Keep every letter, number and hyphen.', 80], ['batchNumber', 'Batch / lot number', 'Often beside the expiry date or on a seal.', 80], ['expiryDate', 'Expiry date', 'Copy the date exactly as printed, including the year.', 80]];
export default function FieldReviewForm({
  fields,
  onChange,
  onSubmit,
  onAddPhoto,
  busy,
  notice,
  photoCount,
  submitLabel = 'Check these details'
}) {
  const visibleCount = ['manufacturer', 'registrationNumber', 'batchNumber', 'expiryDate', 'ingredients'].filter(key => fields[key].trim()).length;
  return <form className="review-form" onSubmit={event => {
    event.preventDefault();
    onSubmit();
  }} aria-busy={busy}>
    <div className="panel-heading"><span className="eyebrow">REVIEW THE PRINTED DETAILS</span><span className="secondary-text">{visibleCount}/5 fields filled</span></div>
    <div className="review-intro"><h2>A quick look before the check.</h2><p>Correct any misread text. Leave what you can’t read blank; the other checks can still run.</p><p className="pidgin">If e no clear, you fit type am.</p></div>
    {notice && <div className="inline-notice" role="status"><Icon name="info" /><p>{notice}</p></div>}
    <div className="field-grid">{fieldLabels.map(([name, label, hint, maxLength]) => <div className={`field ${name === 'productName' || name === 'manufacturer' ? 'field-wide' : ''}`} key={name}>
      <label htmlFor={name}>{label}{name === 'productName' && <span className="optional-label">Optional</span>}</label>
      <p id={`${name}-hint`} className="field-hint">{hint}</p>
      <input id={name} name={name} className={['registrationNumber', 'batchNumber', 'expiryDate'].includes(name) ? 'mono' : ''} value={fields[name]} onChange={event => onChange(name, event.target.value)} disabled={busy} maxLength={maxLength} aria-describedby={`${name}-hint`} placeholder="Not visible in this photo" autoComplete="off" spellCheck={!['registrationNumber', 'batchNumber', 'expiryDate'].includes(name)} />
    </div>)}
    <div className="field field-wide"><label htmlFor="ingredients">Ingredients</label><p id="ingredients-hint" className="field-hint">Copy the list as printed. This checks flagged substances, not personal suitability.</p><textarea id="ingredients" name="ingredients" rows="4" maxLength="3000" value={fields.ingredients} onChange={event => onChange('ingredients', event.target.value)} disabled={busy} placeholder="Not visible in this photo" aria-describedby="ingredients-hint" /></div></div>
    <div className="review-footer"><p>We check these details against available records. A label check cannot confirm what is inside the pack.</p><div className="button-row"><button type="submit" className="button primary" disabled={busy}>{busy ? 'Checking available records…' : submitLabel}{!busy && <Icon name="arrow" />}</button>{photoCount < 2 && <button type="button" className="text-button" onClick={onAddPhoto} disabled={busy}><Icon name="plus" size={17} />Add a photo</button>}</div></div>
  </form>;
}
