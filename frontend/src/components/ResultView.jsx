import { useState } from 'react';
import Icon from './Icon';
import { formatResultForClipboard } from '../services/resultModel';
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

function ScoreBlock({ result }) {
  const score = result.verificationScore;
  const band = result.scoreBand || 'insufficient';
  if (score === null || score === undefined) {
    return (
      <div className="demo-score-area score-insufficient">
        <div className="demo-score-ring score-ring-empty"><div className="demo-score-inner"><strong>—</strong><span>Not enough data</span></div></div>
        <div className="demo-score-copy">
          <span className="eyebrow">VERIFICATION SCORE</span>
          <h2>Not enough information to calculate a score.</h2>
          <p>The percentage measures how many of the available checks matched. It is not an authenticity percentage.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`demo-score-area score-band-${band}`}>
      <div className="demo-score-ring" style={{ '--score': `${score * 3.6}deg` }}>
        <div className="demo-score-inner"><strong>{score}%</strong><span>Verification score</span></div>
      </div>
      <div className="demo-score-copy">
        <span className="eyebrow">VERIFICATION SCORE</span>
        <h2>{result.matchedChecks} of {result.totalChecks} checks matched.</h2>
        <p>This score is calculated as matched checks divided by total checks. Warning, unverified and not-checked outcomes earn no points. It does not prove authenticity.</p>
      </div>
    </div>
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
          <span className="eyebrow">PRODUCT CHECK COMPLETE</span>
          <h1>{result.fields?.productName || 'Product check'}</h1>
          <p>{result.fields?.manufacturer || 'Manufacturer not provided'}</p>
        </div>
        <span className="result-time">{result.checkedAt ? new Date(result.checkedAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : ''}</span>
      </div>

      {photos?.front?.url && photos?.back?.url ? (
        <div className="demo-result-images compact result-images">
          <figure><img src={photos.front.url} alt="Front product preview" /><figcaption>Front</figcaption></figure>
          <figure><img src={photos.back.url} alt="Back product preview" /><figcaption>Back</figcaption></figure>
        </div>
      ) : (
        <div className="saved-photo-note"><Icon name="info" size={16} /><span>Original photos were discarded after processing and are not stored in history.</span></div>
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

      <ScoreBlock result={result} />

      {result.expiryNormalizationNote && (
        <div className="inline-notice"><Icon name="info" size={16} /><p>{result.expiryNormalizationNote}</p></div>
      )}

      <section className="demo-check-section">
        <div className="demo-section-heading"><h2>Individual checks</h2><span>{result.totalChecks || result.checks?.length || 0} outcomes</span></div>
        <div className="demo-check-grid">
          {(result.checks || []).map(check => (
            <article className="demo-check-card" key={check.key}>
              <div className="demo-check-card-top"><h3>{check.title}</h3><ResultStatus status={check.status} /></div>
              <p className="check-reason">{check.reason}</p>
              {check.source && <p className="check-source">Source: {check.source === 'internal-test-fixture' ? 'GenuineNG integration fixture' : check.source}</p>}
              {check.checkedAt && <p className="check-checked-at">Checked: {new Date(check.checkedAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</p>}
              {check.coverageNote && <p className="check-coverage">{check.coverageNote}</p>}
            </article>
          ))}
        </div>
      </section>

      <section className="demo-recommendations">
        <span className="eyebrow">RECOMMENDATION</span>
        <h2>What to do next</h2>
        <p>{result.recommendation}</p>
      </section>

      <div className="demo-result-limit"><Icon name="info" size={18} /><p>{result.limitation}</p></div>

      {showActions && (
        <div className="demo-result-actions result-icon-actions" aria-label="Result actions">
          {onNewScan && <button type="button" className="result-icon-button" onClick={onNewScan} aria-label="Scan again" title="Scan again"><Icon name="scan" size={18} /></button>}
          <button type="button" className="result-icon-button" onClick={toggleSpeech} disabled={!speechSupported()} aria-label={speaking ? 'Stop audio' : 'Read aloud'} title={speaking ? 'Stop audio' : 'Read aloud'}><Icon name={speaking ? 'stop' : 'volume'} size={18} /></button>
          {onEdit && <button type="button" className="result-icon-button" onClick={onEdit} aria-label="Edit details" title="Edit details"><Icon name="edit" size={18} /></button>}
          <button type="button" className="result-icon-button" onClick={copyDetails} aria-label="Copy details" title="Copy details"><Icon name="copy" size={18} /></button>
          {copyMessage && <span className="copy-success" role="status">{copyMessage}</span>}
        </div>
      )}
    </article>
  );
}
