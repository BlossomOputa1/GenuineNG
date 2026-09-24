import { useState } from 'react';
import Icon from './Icon';
import { deriveCompletionState, formatResultForClipboard } from '../services/resultModel';
import { speakResult, speechSupported, stopSpeech } from '../speech/voice';

function statusLabel(status) {
  if (status === 'match') return 'Matched';
  if (status === 'warning') return 'Warning';
  if (status === 'unverified') return 'Unverified';
  return 'Not checked';
}

export function ResultStatus({ status }) {
  return <span className={`demo-status ${status}`}>{statusLabel(status)}</span>;
}

function CompletionBlock({ result }) {
  const completion = result.completion || deriveCompletionState(result.checks || []);
  return (
    <section className={`verification-completion verification-${completion.key}`}>
      <span className="verification-completion-icon"><Icon name={completion.hasWarning ? 'warning' : completion.key === 'insufficient' ? 'info' : 'check'} size={24} /></span>
      <div>
        <span className="eyebrow">VERIFICATION</span>
        <h2>{completion.title}</h2>
        <p>{completion.detail}</p>
      </div>
    </section>
  );
}

export default function ResultView({
  result,
  photos = null,
  onNewScan,
  onEdit,
  compact = false,
  showActions = true,
}) {
  const [copyMessage, setCopyMessage] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const warnings = result.warnings || result.checks?.filter(check => check.status === 'warning') || [];

  async function copyDetails() {
    const text = formatResultForClipboard(result);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopyMessage('Copied to clipboard.');
    window.setTimeout(() => setCopyMessage(''), 2200);
  }

  function toggleSpeech() {
    if (speaking) {
      stopSpeech();
      setSpeaking(false);
      return;
    }
    try {
      setSpeaking(true);
      speakResult(result, { onEnd: () => setSpeaking(false) });
    } catch (error) {
      setCopyMessage(error.message);
      setSpeaking(false);
    }
  }

  return (
    <article className={`demo-stage-card demo-result-stage ${compact ? 'saved-result-card' : ''}`}>
      <div className="demo-result-heading">
        <div>
          <span className="eyebrow">PRODUCT CHECK RESULT</span>
          <h1>{result.fields?.productName || 'Product check'}</h1>
          <p>{result.fields?.manufacturer || 'Manufacturer not provided'}</p>
        </div>
      </div>

      {photos?.front?.url && photos?.back?.url && (
        <div className="demo-result-images compact result-images">
          <figure><img src={photos.front.url} alt="Front product preview" width="640" height="480" loading="lazy" /><figcaption>Front</figcaption></figure>
          <figure><img src={photos.back.url} alt="Back product preview" width="640" height="480" loading="lazy" /><figcaption>Back</figcaption></figure>
        </div>
      )}

      {warnings.length > 0 && (
        <section className="result-warning-banner" role="alert">
          <Icon name="warning" size={22} />
          <div>
            <strong>{warnings.length === 1 ? 'A check needs your attention.' : 'Some checks need your attention.'}</strong>
            {warnings.map(item => <p key={item.key}><b>{item.title}:</b> {item.reason}</p>)}
          </div>
        </section>
      )}

      <CompletionBlock result={result} />

      {result.expiryNormalizationNote && (
        <div className="inline-notice"><Icon name="info" size={16} /><p>{result.expiryNormalizationNote}</p></div>
      )}

      <section className="demo-check-section">
        <div className="demo-section-heading"><h2>Individual checks</h2><span>{result.totalChecks || result.checks?.length || 0} outcomes</span></div>
        <div className="demo-check-grid">
          {(result.checks || []).map(check => (
            <article className={`demo-check-card status-${check.status}`} key={check.key}>
              <div className="demo-check-card-top"><h3>{check.title}</h3><ResultStatus status={check.status} /></div>
              <p className="check-reason">{check.reason}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="demo-recommendations demo-verdict">
        <span className="eyebrow">VERDICT</span>
        <p>{result.verdict}</p>
      </section>

      <div className="result-footer-row">
        {showActions && (
          <div className="demo-result-actions result-icon-actions" aria-label="Result actions">
            {onNewScan && <button type="button" className="result-icon-button" onClick={onNewScan} aria-label="Scan again" title="Scan again"><Icon name="scan" size={18} /></button>}
            <button type="button" className="result-icon-button" onClick={toggleSpeech} disabled={!speechSupported()} aria-label={speaking ? 'Stop audio' : 'Read aloud'} title={speaking ? 'Stop audio' : 'Read aloud'}><Icon name={speaking ? 'stop' : 'volume'} size={18} /></button>
            {onEdit && <button type="button" className="result-icon-button" onClick={onEdit} aria-label="Edit details" title="Edit details"><Icon name="edit" size={18} /></button>}
            <button type="button" className="result-icon-button" onClick={copyDetails} aria-label="Copy details" title="Copy details"><Icon name="copy" size={18} /></button>
            {copyMessage && <span className="copy-success" role="status">{copyMessage}</span>}
          </div>
        )}
        {result.checkedAt && <span className="result-time result-time-footer">{new Date(result.checkedAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</span>}
      </div>
    </article>
  );
}
