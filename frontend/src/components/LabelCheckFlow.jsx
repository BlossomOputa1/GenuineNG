import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import CameraCaptureDialog from './CameraCaptureDialog';
import CheckModeSwitch from './CheckModeSwitch';
import CodeScanFlow from './CodeScanFlow';
import ExtractionReviewDialog from './ExtractionReviewDialog';
import OcrFailureDialog from './OcrFailureDialog';
import ResultView from './ResultView';
import { preprocessImage } from '../ocr/imagePreprocess';
import { extractLabelFields, runLabelVerification } from '../services/api';
import { buildResultRecord } from '../services/resultModel';
import { normalizeExpiryDate } from '../services/labelPayload';
import { getApiErrorMessage, getFallbackReadFailureMessage } from '../services/errorShape';

const emptyFields = { productName: '', manufacturer: '', registrationNumber: '', expiryDate: '' };
function hasAnyField(fields = {}) {
  return ['productName', 'manufacturer', 'registrationNumber', 'expiryDate'].some((key) => String(fields[key] || '').trim());
}

function PhotoSlot({ slot, label, helper, photo, busy, onPick, onRemove, onSnap }) {
  const uploadRef = useRef(null);

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
      {photo ? (
        <>
          <img src={photo.url} alt={`${label} preview`} width="320" height="240" loading="lazy" />
          <div className="demo-photo-meta">
            <div>
              <strong>{label}</strong>
              <span>Ready to read</span>
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
            <button type="button" className="button primary compact-button" onClick={() => onSnap(slot, label)} disabled={busy}>
              <Icon name="camera" size={17} />Snap
            </button>
            <button type="button" className="button secondary compact-button" onClick={() => uploadRef.current?.click()} disabled={busy}>
              <Icon name="upload" size={17} />Upload
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function Processing({ title }) {
  return (
    <div className="demo-processing" role="status" aria-live="polite">
      <div className="demo-spinner" aria-hidden="true" />
      <span className="eyebrow">PROCESSING</span>
      <h2>{title}</h2>
      <div className="demo-progress-line"><span /></div>
    </div>
  );
}

function PreviousScan({ scan, index, onEdit }) {
  return (
    <div className="thread-scan-entry">
      <div className="thread-scan-divider"><span>CHECK {String(index + 1).padStart(2, '0')}</span></div>
      <ResultView result={scan} photos={null} compact onEdit={() => onEdit(scan)} />
    </div>
  );
}


export default function LabelCheckFlow({ initialPhotoFile = null, previousScans = [], onResultComplete, mode = 'guest', onLeave, conversationId = null, initialMode = 'registry', sessionLocked = false }) {
  const [checkMode, setCheckMode] = useState(initialMode);
  const [modeLocked, setModeLocked] = useState(Boolean(sessionLocked || conversationId || previousScans.length));
  const [stage, setStage] = useState('capture');
  const [photos, setPhotos] = useState({ front: null, back: null });
  const [fields, setFields] = useState(emptyFields);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [extractionFailureOpen, setExtractionFailureOpen] = useState(false);
  const [extractionPaused, setExtractionPaused] = useState(false);
  const [partialFields, setPartialFields] = useState(emptyFields);
  const [editingSavedScan, setEditingSavedScan] = useState(null);
  const [cameraTarget, setCameraTarget] = useState(null);
  const initialHandled = useRef(false);
  const extractAbort = useRef(null);
  const verifyAbort = useRef(null);
  const conversationRef = useRef(conversationId);
  const photosRef = useRef(photos);

  const visiblePrevious = useMemo(() => previousScans.filter(scan => scan.id !== result?.id), [previousScans, result?.id]);
  const reviewOpen = checkMode === 'registry' && (stage === 'review' || stage === 'review_saved');

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

  function resetRegistryFlow() {
    extractAbort.current?.abort();
    verifyAbort.current?.abort();
    setExtractionFailureOpen(false);
    setExtractionPaused(false);
    clearPhotos();
    setFields(emptyFields);
    setPartialFields(emptyFields);
    setResult(null);
    setEditingSavedScan(null);
    setError('');
    setStage('capture');
  }

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    if (conversationId || previousScans.length || sessionLocked) setModeLocked(true);
    if (conversationId) setCheckMode(initialMode);
  }, [conversationId, previousScans.length, sessionLocked, initialMode]);

  useEffect(() => () => {
    extractAbort.current?.abort();
    verifyAbort.current?.abort();
    releasePhoto(photosRef.current.front);
    releasePhoto(photosRef.current.back);
  }, []);

  useEffect(() => {
    const previous = conversationRef.current;
    const switchedExistingSession = Boolean(previous && conversationId && previous !== conversationId);
    const startedNewSession = Boolean(previous && !conversationId);
    if (switchedExistingSession || startedNewSession) {
      resetRegistryFlow();
      initialHandled.current = false;
      setCheckMode(initialMode);
      setModeLocked(Boolean(sessionLocked));
    }
    conversationRef.current = conversationId;
  }, [conversationId, initialMode, sessionLocked]);

  async function preparePhoto(slot, file) {
    setBusy(true);
    setError('');
    try {
      const blob = await preprocessImage(file);
      const photo = {
        id: crypto.randomUUID(),
        fileName: file.name || `${slot}.webp`,
        blob,
        url: URL.createObjectURL(blob),
      };
      setPhotos(current => {
        releasePhoto(current[slot]);
        return { ...current, [slot]: photo };
      });
      setModeLocked(true);
      setExtractionPaused(false);
      setEditingSavedScan(null);
    } catch (problem) {
      setError(problem?.message || 'GenuineNG could not open this image.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!initialPhotoFile || initialHandled.current || checkMode !== 'registry') return;
    initialHandled.current = true;
    preparePhoto('front', initialPhotoFile);
  }, [initialPhotoFile, checkMode]);

  async function runCheck(fieldValues = fields) {
    if (!hasAnyField(fieldValues)) {
      setFields({ ...emptyFields, ...fieldValues });
      setError('Enter at least one label detail so GenuineNG has something to check.');
      setStage(editingSavedScan?.id ? 'review_saved' : 'review');
      return;
    }

    if (fieldValues.expiryDate) {
      try {
        normalizeExpiryDate(fieldValues.expiryDate);
      } catch (problem) {
        setError(problem.message);
        setStage(editingSavedScan?.id ? 'review_saved' : 'review');
        return;
      }
    }

    verifyAbort.current?.abort();
    const controller = new AbortController();
    verifyAbort.current = controller;
    setStage('checking');
    setError('');

    try {
      const response = await runLabelVerification(fieldValues, controller.signal);
      const nextResult = buildResultRecord(fieldValues, response);
      if (editingSavedScan?.id) nextResult.id = editingSavedScan.id;
      const persisted = await onResultComplete?.(nextResult, {
        replace: Boolean(editingSavedScan?.id),
        existingScanId: editingSavedScan?.id || null,
      });
      if (persisted?.scanId) {
        nextResult.id = persisted.scanId;
        nextResult.stored = true;
      }
      setFields({ ...emptyFields, ...fieldValues });
      setResult(nextResult);
      setStage('result');
      setEditingSavedScan(null);
    } catch (problem) {
      if (problem?.name === 'AbortError') return;
      setError(problem?.message || 'The verification service could not complete this check.');
      setFields({ ...emptyFields, ...fieldValues });
      setStage(editingSavedScan?.id ? 'review_saved' : 'review');
    }
  }

  function showRequiredFieldNotice() {
    return hasAnyField(fields) ? '' : 'Enter at least one label detail before continuing.';
  }

  useEffect(() => {
    if (checkMode !== 'registry') return;
    if (stage !== 'capture' || busy || extractionPaused || !photos.front || !photos.back) return;

    const controller = new AbortController();
    extractAbort.current = controller;
    setStage('reading');
    setError('');

    extractLabelFields(photos.front.blob, photos.back.blob, controller.signal)
      .then(output => {
        if (controller.signal.aborted) return;
        const extracted = {
          ...emptyFields,
          ...(output?.fields || {}),
          productName: output?.fields?.productName || '',
          manufacturer: output?.fields?.manufacturer || '',
          registrationNumber: output?.fields?.registrationNumber || '',
          expiryDate: output?.fields?.expiryDate || '',
        };
        setPartialFields(extracted);
        setFields(extracted);

        const readFailureMessage = output?.status === 'error' ? getApiErrorMessage(output) : '';
        const extractionSucceeded = output?.status === 'completed' || output?.status === 'success';
        if (!extractionSucceeded || !hasAnyField(extracted)) {
          setPartialFields(extracted);
          setFields({ ...emptyFields, ...extracted });
          setStage('capture');
          setExtractionPaused(true);
          setExtractionFailureOpen(true);
          setError(readFailureMessage || getFallbackReadFailureMessage());
          return;
        }

        // Partial reads are valid: the review dialog lets the user correct what
        // was read, and unsupported checks return Not checked rather than blocking.
        setStage('review');
      })
      .catch(problem => {
        if (problem?.name === 'AbortError') return;
        setPartialFields(emptyFields);
        setFields(emptyFields);
        setError(getApiErrorMessage(problem) || getFallbackReadFailureMessage());
        setStage('capture');
        setExtractionPaused(true);
        setExtractionFailureOpen(true);
      });
  }, [checkMode, stage, busy, extractionPaused, photos.front?.id, photos.back?.id]);

  function openCamera(slot, label) {
    setError('');
    setCameraTarget({ slot, label });
  }

  function closeCamera() {
    setCameraTarget(null);
  }

  function captureCameraPhoto(file) {
    const target = cameraTarget;
    setCameraTarget(null);
    if (target?.slot && file) preparePhoto(target.slot, file);
  }

  function removePhoto(slot) {
    setPhotos(current => {
      releasePhoto(current[slot]);
      return { ...current, [slot]: null };
    });
    setExtractionPaused(false);
    setError('');
  }

  function retakePhotos() {
    setExtractionFailureOpen(false);
    setExtractionPaused(false);
    clearPhotos();
    setFields(emptyFields);
    setPartialFields(emptyFields);
    setError('');
    setStage('capture');
  }

  function closeExtractionFailure() {
    setExtractionFailureOpen(false);
    setExtractionPaused(true);
    setError('');
    setStage('capture');
  }

  function enterManually() {
    setExtractionFailureOpen(false);
    setExtractionPaused(true);
    setFields({ ...emptyFields, ...partialFields });
    setError('');
    setStage('review');
  }

  function editCurrentDetails() {
    setEditingSavedScan(result);
    setFields({ ...emptyFields, ...result.fields });
    setError('');
    setStage(result?.stored ? 'review_saved' : 'review');
  }

  function editSavedScan(scan) {
    clearPhotos();
    setFields({ ...emptyFields, ...scan.fields });
    setResult(scan);
    setEditingSavedScan(scan);
    setError('');
    setStage('review_saved');
    setCheckMode('registry');
  }

  function cancelEdit() {
    if (!editingSavedScan) return;
    setFields({ ...emptyFields, ...editingSavedScan.fields });
    setResult(editingSavedScan);
    setEditingSavedScan(null);
    setError('');
    setStage('result');
  }

  function switchMode(nextMode) {
    if (modeLocked || nextMode === checkMode) return;
    setCheckMode(nextMode);
    if (nextMode === 'registry') return;
    extractAbort.current?.abort();
    verifyAbort.current?.abort();
    setExtractionFailureOpen(false);
    setCameraTarget(null);
    setError('');
  }

  return (
    <section className={`demo-scan-flow ${mode === 'signed' ? 'signed-scan-flow' : ''}`}>
      {visiblePrevious.length > 0 && checkMode === 'registry' && (
        <div className="demo-thread-history" aria-label="Earlier checks in this session">
          {visiblePrevious.map((scan, index) => (
            <PreviousScan key={scan.id} scan={scan} index={index} onEdit={editSavedScan} />
          ))}
        </div>
      )}

      <CheckModeSwitch value={checkMode} onChange={switchMode} locked={modeLocked} />

      {checkMode === 'registry' && stage === 'capture' && (
        <div className="demo-stage-card demo-capture-stage">
          <div className={`demo-stage-heading ${mode === 'signed' && !visiblePrevious.length ? 'signed-capture-heading' : ''}`}>
            <div>
              {!(mode === 'signed' && !visiblePrevious.length) && <span className="eyebrow">PRODUCT LABEL CHECK</span>}
              <h1>{mode === 'signed' && !visiblePrevious.length ? 'What are we checking today?' : 'Show us both sides.'}</h1>
              <p>Add a clear front image and a clear back image.</p>
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
              onSnap={openCamera}
            />
            <PhotoSlot
              slot="back"
              label="Back image"
              helper="Capture the NAFDAC number, manufacturer and expiry details clearly."
              photo={photos.back}
              busy={busy}
              onPick={preparePhoto}
              onRemove={removePhoto}
              onSnap={openCamera}
            />
          </div>
          {error && (
            <div className="inline-notice demo-image-error" role="alert">
              <Icon name="info" />
              <div>
                <strong>We couldn’t use that image.</strong>
                <p>{error}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {checkMode === 'registry' && stage === 'reading' && (
        <div className="demo-stage-card">
          <div className="demo-result-images compact">
            <img src={photos.front?.url} alt="Front product preview" width="320" height="240" loading="lazy" />
            <img src={photos.back?.url} alt="Back product preview" width="320" height="240" loading="lazy" />
          </div>
          <Processing title="Reading the label details…" />
        </div>
      )}

      {checkMode === 'registry' && reviewOpen && photos.front?.url && photos.back?.url && (
        <div className="demo-stage-card demo-review-backdrop-card">
          <div className="demo-result-images compact">
            <img src={photos.front.url} alt="Front product preview" width="320" height="240" loading="lazy" />
            <img src={photos.back.url} alt="Back product preview" width="320" height="240" loading="lazy" />
          </div>
        </div>
      )}

      {checkMode === 'registry' && stage === 'checking' && (
        <div className="demo-stage-card">
          {photos.front?.url && photos.back?.url && (
            <div className="demo-result-images compact">
              <img src={photos.front.url} alt="Front product preview" width="320" height="240" loading="lazy" />
              <img src={photos.back.url} alt="Back product preview" width="320" height="240" loading="lazy" />
            </div>
          )}
          <Processing title="Checking the registration and expiry…" />
        </div>
      )}

      {checkMode === 'registry' && stage === 'result' && result && (
        <ResultView result={result} photos={photos} onNewScan={resetRegistryFlow} onEdit={editCurrentDetails} />
      )}

      {checkMode === 'code' && (
        <CodeScanFlow
          previousScans={previousScans}
          onResultComplete={onResultComplete}
          onStart={() => setModeLocked(true)}
          mode={mode}
        />
      )}

      <ExtractionReviewDialog
        open={reviewOpen}
        fields={fields}
        onChange={(key, value) => {
          setFields(current => ({ ...current, [key]: value }));
          setError('');
        }}
        onContinue={() => runCheck(fields)}
        onClose={editingSavedScan ? cancelEdit : undefined}
        onCancel={editingSavedScan ? cancelEdit : undefined}
        busy={false}
        error={showRequiredFieldNotice() || error}
        savedEdit={stage === 'review_saved'}
      />

      <CameraCaptureDialog
        open={Boolean(cameraTarget)}
        label={cameraTarget?.label || 'product image'}
        onCapture={captureCameraPhoto}
        onClose={closeCamera}
      />

      <OcrFailureDialog
        open={extractionFailureOpen}
        onRetake={retakePhotos}
        onManual={enterManually}
        onClose={closeExtractionFailure}
        message={error || getFallbackReadFailureMessage()}
      />
    </section>
  );
}
