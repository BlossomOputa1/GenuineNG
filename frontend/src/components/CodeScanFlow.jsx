import { useEffect, useMemo, useRef, useState } from 'react';
import jsQR from 'jsqr';
import Icon from './Icon';
import { parseSignedQr } from '../crypto/verifySignature';
import { verifyCode } from '../services/api';

function reuseLabel(value) {
  return {
    first_scan: 'First public scan',
    previously_scanned: 'Previously scanned',
    reuse_limit_reached: 'Reuse limit reached — unit deactivated',
    revoked: 'Unit already deactivated',
    manufacturer_check: 'Manufacturer verification — public count unchanged',
    unavailable: 'Reuse activity unavailable',
  }[value] || value || 'Unavailable';
}

function CodeResult({ result, compact = false }) {
  if (!result) return null;
  const genuine = result.verdict === 'genuine';
  const product = result.product || {};
  return (
    <article className={`code-scan-result-card ${genuine ? 'success' : 'warning'} ${compact ? 'compact' : ''}`}>
      <div className="code-scan-result-head">
        <span className={`code-scan-result-icon ${genuine ? 'success' : 'warning'}`}>
          <Icon name={genuine ? 'check' : 'warning'} size={18} />
        </span>
        <div>
          <span className="eyebrow">VERIFICATION RESULT</span>
          <h2>{genuine ? 'Genuine' : 'Not Genuine'}</h2>
        </div>
      </div>
      <p>{result.reason}</p>
      <div className="code-result-details">
        <div><small>Product</small><strong>{product.name || 'Not available'}</strong></div>
        <div><small>Manufacturer</small><strong>{product.manufacturer || 'Not available'}</strong></div>
        <div><small>Batch</small><strong>{product.batchCode || 'Not available'}</strong></div>
        <div><small>Unit</small><strong>{product.unitId || result.payload?.unitId || 'Not available'}</strong></div>
      </div>
      <div className="code-scan-reuse-note">
        <strong>Reuse activity</strong>
        <span>{reuseLabel(result.reuseStatus || result.reuseCheck)}</span>
        {result.publicScanNumber ? <small>Public scan #{result.publicScanNumber}</small> : null}
      </div>
    </article>
  );
}

function cameraMessage(problem) {
  if (problem?.name === 'NotAllowedError' || problem?.name === 'SecurityError') {
    return 'Camera permission is blocked. Allow camera access for GenuineNG in your browser settings, then try again.';
  }
  if (problem?.name === 'NotFoundError' || problem?.name === 'DevicesNotFoundError') {
    return 'No camera was found. Connect or enable an integrated, USB, or phone camera and try again.';
  }
  if (problem?.name === 'NotReadableError' || problem?.name === 'TrackStartError') {
    return 'The selected camera is busy or unavailable. Close other apps using it, or switch cameras.';
  }
  return problem?.message || 'The camera could not be opened.';
}

export default function CodeScanFlow({ previousScans = [], onResultComplete, onStart, mode = 'signed' }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const decodeLockedRef = useRef(false);
  const lastFrameRef = useRef(0);
  const unreadableTimerRef = useRef(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraPending, setCameraPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [result, setResult] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  const allResults = useMemo(() => previousScans.filter((item) => item.id !== result?.id), [previousScans, result?.id]);

  function stopCamera() {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    clearTimeout(unreadableTimerRef.current);
    unreadableTimerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
    setCameraPending(false);
    setHint('');
  }

  useEffect(() => () => stopCamera(), []);

  async function refreshDevices(stream) {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const cameras = list.filter((device) => device.kind === 'videoinput');
      setDevices(cameras);
      const activeId = stream?.getVideoTracks?.()[0]?.getSettings?.().deviceId || '';
      if (activeId) setSelectedDeviceId(activeId);
      return cameras;
    } catch {
      return [];
    }
  }

  async function openCamera(deviceId = selectedDeviceId) {
    onStart?.();
    stopCamera();
    setError('');
    setResult(null);
    setCameraPending(true);
    decodeLockedRef.current = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraPending(false);
      setError('Camera access is not supported in this browser.');
      return;
    }

    try {
      const video = deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } };
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
      streamRef.current = stream;
      setCameraOpen(true);
      await refreshDevices(stream);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => setError('Tap the camera preview to start video playback.'));
        }
      });
      unreadableTimerRef.current = setTimeout(() => {
        setHint('QR not readable yet. Move closer, reduce glare, and keep the full code inside the square.');
      }, 8000);
    } catch (problem) {
      setError(cameraMessage(problem));
    } finally {
      setCameraPending(false);
    }
  }

  async function switchCamera() {
    if (devices.length < 2) return;
    const currentIndex = Math.max(0, devices.findIndex((device) => device.deviceId === selectedDeviceId));
    const next = devices[(currentIndex + 1) % devices.length];
    setSelectedDeviceId(next.deviceId);
    await openCamera(next.deviceId);
  }

  async function verifyRaw(rawValue) {
    if (decodeLockedRef.current) return;
    decodeLockedRef.current = true;
    setBusy(true);
    setError('');
    setHint('');
    stopCamera();
    try {
      const signed = parseSignedQr(rawValue);
      const response = await verifyCode(signed);
      const completed = {
        type: 'genuine_code',
        ...response,
        payload: signed.payload,
        signature: signed.signature,
        checkedAt: new Date().toISOString(),
      };
      const persisted = await onResultComplete?.(completed);
      if (persisted?.scanId) {
        completed.id = persisted.scanId;
        completed.stored = true;
      }
      setResult(completed);
    } catch (problem) {
      setError(problem?.message || 'GenuineNG could not verify this QR code.');
    } finally {
      setBusy(false);
      decodeLockedRef.current = false;
    }
  }

  function scanFrame(time) {
    if (!cameraOpen || busy || decodeLockedRef.current) return;
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth) {
      frameRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    if (time - lastFrameRef.current < 120) {
      frameRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    lastFrameRef.current = time;

    const canvas = canvasRef.current;
    const maxWidth = 760;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    canvas.width = Math.max(1, Math.floor(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.floor(video.videoHeight * scale));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
    if (code?.data) {
      verifyRaw(code.data);
      return;
    }
    frameRef.current = requestAnimationFrame(scanFrame);
  }

  useEffect(() => {
    if (!cameraOpen || busy) return undefined;
    frameRef.current = requestAnimationFrame(scanFrame);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [cameraOpen, busy, selectedDeviceId]);

  return (
    <div className="code-scan-flow">
      {allResults.length > 0 && (
        <div className="demo-thread-history" aria-label="Earlier GenuineNG code checks">
          {allResults.map((scan, index) => (
            <div className="thread-scan-entry" key={scan.id || `${scan.checkedAt}-${index}`}>
              <div className="thread-scan-divider"><span>CHECK {String(index + 1).padStart(2, '0')}</span></div>
              <CodeResult result={scan} compact />
            </div>
          ))}
        </div>
      )}

      <section className="demo-stage-card code-scan-stage">
        <div className="mode-panel-heading">
          <span className="eyebrow">GENUINENG CODE CHECK</span>
          <h1>Scan the GenuineNG code.</h1>
        </div>

        {cameraOpen ? (
          <>
            <div className="layer2-live-scanner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                aria-label="Live GenuineNG QR scanner"
                onClick={() => videoRef.current?.play()}
              />
              <span className="layer2-qr-guide" aria-hidden="true" />
              <div className="layer2-camera-caption">Keep the complete QR inside the square.</div>
            </div>
            <div className="layer2-scan-actions">
              <button type="button" className="button secondary" onClick={stopCamera}>Stop camera</button>
              {devices.length > 1 && (
                <button type="button" className="button secondary" onClick={switchCamera}>
                  <Icon name="camera" size={17} /> Switch camera
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="code-scan-launcher">
            <div className="code-scan-launcher-icon">
              <Icon name="qr" size={28} />
            </div>
            <div className="code-scan-launcher-copy">
              <strong>{result ? 'Scan another code' : 'Camera scan'}</strong>
              <span>Point your camera at a GenuineNG QR and it will be read automatically.</span>
            </div>
            <button
              type="button"
              className="button primary"
              onClick={() => openCamera()}
              disabled={cameraPending || busy}
            >
              <Icon name="camera" size={17} />
              {cameraPending ? 'Opening camera…' : 'Open camera'}
            </button>
          </div>
        )}

        <canvas ref={canvasRef} className="visually-hidden" aria-hidden="true" />

        {hint && !error && <div className="inline-notice"><Icon name="info" size={18} /><p>{hint}</p></div>}
        {error && <div className="inline-notice form-error" role="alert"><Icon name="warning" size={18} /><p>{error}</p></div>}
        {busy && <div className="layer2-checking-state" role="status"><span className="demo-spinner" /><p>Checking this unit with GenuineNG…</p></div>}
        {result && <CodeResult result={result} />}
        {mode === 'guest' && <p className="code-scan-signin-note">Sign in to save GenuineNG code results to your history.</p>}
      </section>
    </div>
  );
}

export { CodeResult };
