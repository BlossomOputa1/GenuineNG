import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import FieldReviewForm from './FieldReviewForm';
import { preprocessImage } from '../ocr/imagePreprocess';
import {
  demoExtractedFields,
  formatDemoResultForClipboard,
  makeDemoResult
} from '../services/demoPrototype';

function PhotoSlot({ slot, label, helper, photo, busy, onPick, onRemove }) {
  const uploadRef = useRef(null);
  const cameraRef = useRef(null);

  function choose(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onPick(slot, file);
  }

  return (
    <article className={`demo-photo-slot ${photo ? 'has-photo' : ''}`}>
      <input
        ref={uploadRef}
        className="visually-hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={choose}
        tabIndex="-1"
      />
      <input
        ref={cameraRef}
        className="visually-hidden"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={choose}
        tabIndex="-1"
      />

      {photo ? (
        <>
          <img src={photo.url} alt={`${label} preview`} />
          <div className="demo-photo-meta">
            <div>
              <strong>{label}</strong>
              <span>Ready for the demo read</span>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={() => onRemove(slot)}
              disabled={busy}
              aria-label={`Remove ${label.toLowerCase()}`}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        </>
      ) : (
        <div className="demo-photo-empty">
          <span className="demo-photo-icon"><Icon name="camera" size={26} /></span>
          <strong>{label}</strong>
          <p>{helper}</p>
          <div className="demo-photo-actions">
            <button
              type="button"
              className="button primary compact-button"
              onClick={() => cameraRef.current?.click()}
              disabled={busy}
            >
              <Icon name="camera" size={17} />
              Snap
            </button>
            <button
              type="button"
              className="button secondary compact-button"
              onClick={() => uploadRef.current?.click()}
              disabled={busy}
            >
              <Icon name="upload" size={17} />
              Upload
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function DemoProgress({ title, copy }) {
  return (
    <div className="demo-processing" role="status" aria-live="polite">
      <div className="demo-spinner" aria-hidden="true" />
      <span className="eyebrow">DEMO PROCESSING</span>
      <h2>{title}</h2>
      <p>{copy}</p>
      <div className="demo-progress-line"><span /></div>
    </div>
  );
}

function ResultStatus({ status }) {
  const label = status === 'match' ? 'Checked' : status === 'warning' ? 'Warning' : 'Not checked';
  return <span className={`demo-status ${status}`}>{label}</span>;
}

function PreviousScan({ scan, index }) {
  return (
    <article className="demo-previous-scan">
      <div className="demo-previous-heading">
        <div>
          <span className="eyebrow">EARLIER CHECK {String(index + 1).padStart(2, '0')}</span>
          <h3>{scan.fields?.productName || 'Product check'}</h3>
        </div>
        <span className="demo-history-score">{scan.score}%</span>
      </div>
      <p>{scan.fields?.manufacturer || 'Manufacturer not provided'}</p>
      <div className="demo-previous-checks">
        {(scan.checks || []).map(check => (
          <span key={check.key}>{check.title}: <strong>{check.value}</strong></span>
        ))}
      </div>
      <p className="demo-photo-discarded"><Icon name="info" size={14} /> Images are not stored in demo history.</p>
    </article>
  );
}

export default function DemoScanFlow({
  initialPhotoFile = null,
  previousScans = [],
  onResultComplete,
  mode = 'guest',
  onLeave,
  conversationId = null
}) {
  const [stage, setStage] = useState('capture');
  const [photos, setPhotos] = useState({ front: null, back: null });
  const [fields, setFields] = useState({ ...demoExtractedFields });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const initialHandled = useRef(false);
  const conversationRef = useRef(conversationId);
  const readingTimer = useRef(null);
  const checkingTimer = useRef(null);

  const visiblePrevious = useMemo(
    () => previousScans.filter(scan => scan.id !== result?.id),
    [previousScans, result?.id]
  );

  function releasePhoto(photo) {
    if (photo?.url) URL.revokeObjectURL(photo.url);
  }

  function clearPhotos() {
    setPhotos(current => {
      releasePhoto(current.front);
      releasePhoto(current.back);
      return { front: null, back: null };
    });
  }

  useEffect(() => () => {
    clearTimeout(readingTimer.current);
    clearTimeout(checkingTimer.current);
    releasePhoto(photos.front);
    releasePhoto(photos.back);
  }, []);

  async function preparePhoto(slot, file) {
    setBusy(true);
    setError('');
    try {
      const blob = await preprocessImage(file);
      const photo = {
        id: crypto.randomUUID(),
        fileName: file.name || `${slot}-product-photo.jpg`,
        blob,
        url: URL.createObjectURL(blob)
      };

      setPhotos(current => {
        releasePhoto(current[slot]);
        return { ...current, [slot]: photo };
      });
      return photo;
    } catch (problem) {
      setError(
        problem?.message ||
          'GenuineNG could not open this image. Try a clearer JPG, PNG or WebP photo.'
      );
      return null;
    } finally {
      setBusy(false);
    }
  }


  useEffect(() => {
    const previousConversation = conversationRef.current;
    const changedExistingConversation = previousConversation && previousConversation !== conversationId;
    const startedNewConversation = previousConversation && !conversationId;

    if (changedExistingConversation || startedNewConversation) {
      clearTimeout(readingTimer.current);
      clearTimeout(checkingTimer.current);
      clearPhotos();
      setFields({ ...demoExtractedFields });
      setResult(null);
      setError('');
      setCopyMessage('');
      setStage('capture');
      initialHandled.current = false;
    }

    conversationRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    if (!initialPhotoFile || initialHandled.current) return;
    initialHandled.current = true;
    preparePhoto('front', initialPhotoFile);
  }, [initialPhotoFile]);

  useEffect(() => {
    if (stage !== 'capture' || !photos.front || !photos.back || busy) return;

    // Move into the reading screen immediately, then reveal the fixed demo
    // extraction after a short delay. Do not clear this timer just because
    // stage changes to `reading` — that was keeping the UI loading forever.
    clearTimeout(readingTimer.current);
    setStage('reading');
    readingTimer.current = window.setTimeout(() => {
      setFields({ ...demoExtractedFields });
      setStage('review');
      readingTimer.current = null;
    }, 1500);
  }, [stage, photos.front?.id, photos.back?.id, busy]);

  function removePhoto(slot) {
    setPhotos(current => {
      releasePhoto(current[slot]);
      return { ...current, [slot]: null };
    });
    setError('');
  }

  function runCheck() {
    setStage('checking');
    setError('');
    checkingTimer.current = window.setTimeout(() => {
      const nextResult = makeDemoResult(fields);
      const replacingExisting = Boolean(result?.id);
      if (replacingExisting) nextResult.id = result.id;
      setResult(nextResult);
      setStage('result');
      onResultComplete?.(nextResult, { replace: replacingExisting });
    }, 1500);
  }

  function editDetails() {
    setCopyMessage('');
    setStage('review');
  }

  function newScan() {
    clearTimeout(readingTimer.current);
    clearTimeout(checkingTimer.current);
    clearPhotos();
    setFields({ ...demoExtractedFields });
    setResult(null);
    setError('');
    setCopyMessage('');
    setStage('capture');
  }

  async function copyDetails() {
    const text = formatDemoResultForClipboard(result);
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage('Copied to clipboard.');
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
      setCopyMessage('Copied to clipboard.');
    }
  }

  return (
    <section className={`demo-scan-flow ${mode === 'signed' ? 'signed-scan-flow' : ''}`}>
      {visiblePrevious.length > 0 && (
        <div className="demo-thread-history" aria-label="Earlier checks in this session">
          {visiblePrevious.map((scan, index) => (
            <PreviousScan key={scan.id} scan={scan} index={index} />
          ))}
        </div>
      )}

      {stage === 'capture' && (
        <div className="demo-stage-card demo-capture-stage">
          <div className="demo-stage-heading">
            <div>
              <span className="eyebrow">TWO-SIDE PRODUCT CHECK</span>
              <h1>{mode === 'signed' && !visiblePrevious.length ? 'What are we checking today?' : 'Show us both sides.'}</h1>
              <p>
                Add a clear front image and a clear back image. For this frontend prototype,
                any valid pair of images will return the same demo label data.
              </p>
            </div>
            {mode === 'guest' && onLeave && (
              <button type="button" className="text-button" onClick={onLeave}>
                <Icon name="back" size={16} /> Back to main
              </button>
            )}
          </div>

          <div className="demo-photo-grid">
            <PhotoSlot
              slot="front"
              label="Front image"
              helper="Capture the product name and main label clearly."
              photo={photos.front}
              busy={busy}
              onPick={preparePhoto}
              onRemove={removePhoto}
            />
            <PhotoSlot
              slot="back"
              label="Back image"
              helper="Capture the NAFDAC number, batch, expiry and ingredients."
              photo={photos.back}
              busy={busy}
              onPick={preparePhoto}
              onRemove={removePhoto}
            />
          </div>

          <div className="demo-requirement-line">
            <Icon name="lock" size={15} />
            <span>Both images are required before the demo read starts. Photos are kept only in this active view.</span>
          </div>

          {error && (
            <div className="inline-notice demo-image-error" role="alert">
              <Icon name="info" />
              <div>
                <strong>We couldn’t use that image.</strong>
                <p>{error} Please scan or upload it again.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {stage === 'reading' && (
        <div className="demo-stage-card">
          <div className="demo-result-images compact">
            <img src={photos.front?.url} alt="Front product preview" />
            <img src={photos.back?.url} alt="Back product preview" />
          </div>
          <DemoProgress
            title="Reading the printed details…"
            copy="We’re preparing the demo fields from both product images."
          />
        </div>
      )}

      {stage === 'review' && (
        <div className="demo-stage-card demo-review-stage">
          <div className="demo-result-images">
            <figure>
              <img src={photos.front?.url} alt="Front product preview" />
              <figcaption>Front image</figcaption>
            </figure>
            <figure>
              <img src={photos.back?.url} alt="Back product preview" />
              <figcaption>Back image</figcaption>
            </figure>
          </div>

          <FieldReviewForm
            fields={fields}
            onChange={(key, value) => setFields(current => ({ ...current, [key]: value }))}
            onSubmit={runCheck}
            onAddPhoto={() => setStage('capture')}
            busy={false}
            notice="Demo extraction complete. Review and edit anything you want before continuing."
            photoCount={2}
            submitLabel="Continue to check"
          />
        </div>
      )}

      {stage === 'checking' && (
        <div className="demo-stage-card">
          <div className="demo-result-images compact">
            <img src={photos.front?.url} alt="Front product preview" />
            <img src={photos.back?.url} alt="Back product preview" />
          </div>
          <DemoProgress
            title="Running the demo checks…"
            copy="Registration, expiry, recall and ingredient outcomes are being assembled for the prototype."
          />
        </div>
      )}

      {stage === 'result' && result && (
        <article className="demo-stage-card demo-result-stage">
          <div className="demo-result-heading">
            <div>
              <span className="eyebrow">PRODUCT CHECK COMPLETE</span>
              <h1>{result.fields.productName}</h1>
              <p>{result.fields.manufacturer}</p>
            </div>
            <span className="demo-only-pill">Demo data</span>
          </div>

          <div className="demo-result-images compact result-images">
            <figure>
              <img src={photos.front?.url} alt="Front product preview" />
              <figcaption>Front</figcaption>
            </figure>
            <figure>
              <img src={photos.back?.url} alt="Back product preview" />
              <figcaption>Back</figcaption>
            </figure>
          </div>

          <div className="demo-score-area">
            <div className="demo-score-ring" style={{ '--score': `${result.score * 3.6}deg` }}>
              <div className="demo-score-inner">
                <strong>{result.score}%</strong>
                <span>{result.scoreLabel}</span>
              </div>
            </div>
            <div className="demo-score-copy">
              <span className="eyebrow">WHAT THIS MEANS</span>
              <h2>Strong demo consistency, not proof of authenticity.</h2>
              <p>
                This percentage is here to test the interface only. GenuineNG Layer 1 should still
                explain every individual check instead of turning the whole result into one yes/no verdict.
              </p>
            </div>
          </div>

          <section className="demo-check-section">
            <div className="demo-section-heading">
              <h2>Check values</h2>
              <span>4 demo outcomes</span>
            </div>
            <div className="demo-check-grid">
              {result.checks.map(check => (
                <article className="demo-check-card" key={check.key}>
                  <div className="demo-check-card-top">
                    <h3>{check.title}</h3>
                    <ResultStatus status={check.status} />
                  </div>
                  <strong className="demo-check-value">{check.value}</strong>
                  <p>{check.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="demo-recommendations">
            <span className="eyebrow">RECOMMENDATIONS</span>
            <h2>What to do next</h2>
            <ol>
              {result.recommendations.map(item => <li key={item}>{item}</li>)}
            </ol>
          </section>

          <div className="demo-result-limit">
            <Icon name="info" size={18} />
            <p>{result.coverage}</p>
          </div>

          <div className="demo-result-actions">
            <button type="button" className="button primary" onClick={newScan}>
              <Icon name="plus" size={17} /> New scan / upload
            </button>
            <button type="button" className="button secondary" onClick={editDetails}>
              Edit details
            </button>
            <button type="button" className="button secondary" onClick={copyDetails}>
              Copy details
            </button>
            {copyMessage && <span className="copy-success" role="status">{copyMessage}</span>}
          </div>
        </article>
      )}
    </section>
  );
}
