import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import CameraCaptureDialog from './CameraCaptureDialog';
import ExtractionReviewDialog from './ExtractionReviewDialog';
import OcrFailureDialog from './OcrFailureDialog';
import ResultView from './ResultView';
import { preprocessImage } from '../ocr/imagePreprocess';
import { extractLabelFields, runLabelVerification } from '../services/api';
import { buildResultRecord } from '../services/resultModel';
import { normalizeExpiryDate } from '../services/labelPayload';

const emptyFields = { productName: '', manufacturer: '', registrationNumber: '', expiryDate: '' };
const requiredIdentityKeys = ['productName', 'manufacturer', 'registrationNumber'];

function missingRequiredIdentity(fields = {}) {
  return requiredIdentityKeys.filter(key => !String(fields[key] || '').trim());
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
      <input ref={uploadRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={choose} tabIndex="-1" />
      {photo ? <>
        <img src={photo.url} alt={`${label} preview`} />
        <div className="demo-photo-meta"><div><strong>{label}</strong><span>Ready to read</span></div><button type="button" className="icon-button" onClick={() => onRemove(slot)} disabled={busy} aria-label={`Remove ${label.toLowerCase()}`}><Icon name="close" size={16} /></button></div>
      </> : <div className="demo-photo-empty">
        <span className="demo-photo-icon"><Icon name="camera" size={26} /></span><strong>{label}</strong><p>{helper}</p>
        <div className="demo-photo-actions">
          <button type="button" className="button primary compact-button" onClick={() => onSnap(slot, label)} disabled={busy}><Icon name="camera" size={17} />Snap</button>
          <button type="button" className="button secondary compact-button" onClick={() => uploadRef.current?.click()} disabled={busy}><Icon name="upload" size={17} />Upload</button>
        </div>
      </div>}
    </article>
  );
}

function Processing({ title }) {
  return <div className="demo-processing" role="status" aria-live="polite"><div className="demo-spinner" aria-hidden="true" /><span className="eyebrow">PROCESSING</span><h2>{title}</h2><div className="demo-progress-line"><span /></div></div>;
}

function PreviousScan({ scan, index, onEdit }) {
  return (
    <div className="thread-scan-entry">
      <div className="thread-scan-divider"><span>CHECK {String(index + 1).padStart(2, '0')}</span></div>
      <ResultView result={scan} photos={null} compact onEdit={() => onEdit(scan)} />
    </div>
  );
}

export default function LabelCheckFlow({ initialPhotoFile = null, previousScans = [], onResultComplete, mode = 'guest', onLeave, conversationId = null }) {
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
  const reviewOpen = stage === 'review' || stage === 'review_saved';

  function releasePhoto(photo) { if (photo?.url) URL.revokeObjectURL(photo.url); }
  function clearPhotos() { setPhotos(current => { releasePhoto(current.front); releasePhoto(current.back); return { front: null, back: null }; }); }

  useEffect(() => { photosRef.current = photos; }, [photos]);
  useEffect(() => () => { extractAbort.current?.abort(); verifyAbort.current?.abort(); releasePhoto(photosRef.current.front); releasePhoto(photosRef.current.back); }, []);

  useEffect(() => {
    const previous = conversationRef.current;
    const switchedExistingSession = Boolean(previous && conversationId && previous !== conversationId);
    const startedNewSession = Boolean(previous && !conversationId);
    if (switchedExistingSession || startedNewSession) {
      extractAbort.current?.abort(); verifyAbort.current?.abort(); clearPhotos(); setFields(emptyFields); setResult(null); setError(''); setStage('capture'); setEditingSavedScan(null); setExtractionPaused(false); initialHandled.current = false;
    }
    conversationRef.current = conversationId;
  }, [conversationId]);

  async function preparePhoto(slot, file) {
    setBusy(true); setError('');
    try {
      const blob = await preprocessImage(file);
      const photo = { id: crypto.randomUUID(), fileName: file.name || `${slot}.webp`, blob, url: URL.createObjectURL(blob) };
      setPhotos(current => { releasePhoto(current[slot]); return { ...current, [slot]: photo }; });
      setExtractionPaused(false);
      setEditingSavedScan(null);
    } catch (problem) { setError(problem?.message || 'GenuineNG could not open this image.'); }
    finally { setBusy(false); }
  }

  useEffect(() => { if (!initialPhotoFile || initialHandled.current) return; initialHandled.current = true; preparePhoto('front', initialPhotoFile); }, [initialPhotoFile]);

  async function runCheck(fieldValues = fields) {
    const missing = missingRequiredIdentity(fieldValues);
    if (missing.length) {
      setFields({ ...emptyFields, ...fieldValues });
      setError('Product name / variant, manufacturer and NAFDAC registration number are required.');
      setStage(editingSavedScan?.id ? 'review_saved' : 'review');
      return;
    }

    if (fieldValues.expiryDate) {
      try { normalizeExpiryDate(fieldValues.expiryDate); }
      catch (problem) {
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
      const persisted = await onResultComplete?.(nextResult, { replace: Boolean(editingSavedScan?.id), existingScanId: editingSavedScan?.id || null });
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

  useEffect(() => {
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

        if (output?.status !== 'completed' || missingRequiredIdentity(extracted).length) {
          setStage('capture');
          setExtractionPaused(true);
          setExtractionFailureOpen(true);
          return;
        }

        // Always stop for human confirmation before any verification request.
        setStage('review');
      })
      .catch(problem => {
        if (problem?.name === 'AbortError') return;
        setPartialFields(emptyFields);
        setFields(emptyFields);
        setError(problem?.message || 'GenuineNG could not read these images.');
        setStage('capture');
        setExtractionPaused(true);
        setExtractionFailureOpen(true);
      });
  }, [stage, busy, extractionPaused, photos.front?.id, photos.back?.id]);

  function openCamera(slot, label) { setError(''); setCameraTarget({ slot, label }); }
  function closeCamera() { setCameraTarget(null); }
  function captureCameraPhoto(file) { const target = cameraTarget; setCameraTarget(null); if (target?.slot && file) preparePhoto(target.slot, file); }

  function removePhoto(slot) { setPhotos(current => { releasePhoto(current[slot]); return { ...current, [slot]: null }; }); setExtractionPaused(false); setError(''); }
  function retakePhotos() { setExtractionFailureOpen(false); setExtractionPaused(false); clearPhotos(); setFields(emptyFields); setPartialFields(emptyFields); setError(''); setStage('capture'); }
  function closeExtractionFailure() { setExtractionFailureOpen(false); setExtractionPaused(true); setError(''); setStage('capture'); }
  function enterManually() { setExtractionFailureOpen(false); setExtractionPaused(true); setFields({ ...emptyFields, ...partialFields }); setError(''); setStage('review'); }

  function editCurrentDetails() { setEditingSavedScan(result); setFields({ ...emptyFields, ...result.fields }); setError(''); setStage(result?.stored ? 'review_saved' : 'review'); }
  function editSavedScan(scan) { clearPhotos(); setFields({ ...emptyFields, ...scan.fields }); setResult(scan); setEditingSavedScan(scan); setError(''); setStage('review_saved'); }
  function cancelEdit() { if (!editingSavedScan) return; setFields({ ...emptyFields, ...editingSavedScan.fields }); setResult(editingSavedScan); setEditingSavedScan(null); setError(''); setStage('result'); }
  function newScan() { extractAbort.current?.abort(); verifyAbort.current?.abort(); setExtractionPaused(false); clearPhotos(); setFields(emptyFields); setPartialFields(emptyFields); setResult(null); setEditingSavedScan(null); setError(''); setStage('capture'); }

  return <section className={`demo-scan-flow ${mode === 'signed' ? 'signed-scan-flow' : ''}`}>
    {visiblePrevious.length > 0 && <div className="demo-thread-history" aria-label="Earlier checks in this session">{visiblePrevious.map((scan, index) => <PreviousScan key={scan.id} scan={scan} index={index} onEdit={editSavedScan} />)}</div>}

    {stage === 'capture' && <div className="demo-stage-card demo-capture-stage">
      <div className={`demo-stage-heading ${mode === 'signed' && !visiblePrevious.length ? 'signed-capture-heading' : ''}`}><div>{!(mode === 'signed' && !visiblePrevious.length) && <span className="eyebrow">PRODUCT LABEL CHECK</span>}<h1>{mode === 'signed' && !visiblePrevious.length ? 'What are we checking today?' : 'Show us both sides.'}</h1><p>Add a clear front image and a clear back image.</p></div>{mode === 'guest' && onLeave && <button type="button" className="text-button" onClick={onLeave}><Icon name="back" size={16} /> Back to main</button>}</div>
      <div className="demo-photo-grid"><PhotoSlot slot="front" label="Front image" helper="Capture the product name and main label clearly." photo={photos.front} busy={busy} onPick={preparePhoto} onRemove={removePhoto} onSnap={openCamera} /><PhotoSlot slot="back" label="Back image" helper="Capture the NAFDAC number, manufacturer and expiry details clearly." photo={photos.back} busy={busy} onPick={preparePhoto} onRemove={removePhoto} onSnap={openCamera} /></div>
      {error && <div className="inline-notice demo-image-error" role="alert"><Icon name="info" /><div><strong>We couldn’t use that image.</strong><p>{error}</p></div></div>}
    </div>}

    {stage === 'reading' && <div className="demo-stage-card"><div className="demo-result-images compact"><img src={photos.front?.url} alt="Front product preview" /><img src={photos.back?.url} alt="Back product preview" /></div><Processing title="Reading the label details…" /></div>}

    {reviewOpen && photos.front?.url && photos.back?.url && <div className="demo-stage-card demo-review-backdrop-card">
      <div className="demo-result-images compact"><img src={photos.front.url} alt="Front product preview" /><img src={photos.back.url} alt="Back product preview" /></div>
    </div>}

    {stage === 'checking' && <div className="demo-stage-card">{photos.front?.url && photos.back?.url && <div className="demo-result-images compact"><img src={photos.front.url} alt="Front product preview" /><img src={photos.back.url} alt="Back product preview" /></div>}<Processing title="Checking the registration and expiry…" /></div>}

    {stage === 'result' && result && <ResultView result={result} photos={photos} onNewScan={newScan} onEdit={editCurrentDetails} />}

    <ExtractionReviewDialog
      open={reviewOpen}
      fields={fields}
      onChange={(key, value) => { setFields(current => ({ ...current, [key]: value })); setError(''); }}
      onContinue={() => runCheck(fields)}
      onClose={editingSavedScan ? cancelEdit : undefined}
      onCancel={editingSavedScan ? cancelEdit : undefined}
      busy={false}
      error={error}
      savedEdit={stage === 'review_saved'}
    />

    <CameraCaptureDialog open={Boolean(cameraTarget)} label={cameraTarget?.label || 'product image'} onCapture={captureCameraPhoto} onClose={closeCamera} />

    <OcrFailureDialog open={extractionFailureOpen} onRetake={retakePhotos} onManual={enterManually} onClose={closeExtractionFailure} />
  </section>;
}
