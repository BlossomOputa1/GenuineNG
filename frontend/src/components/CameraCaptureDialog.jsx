import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';

export default function CameraCaptureDialog({ open, label = 'product image', onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fallbackInputRef = useRef(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  function stopStream() {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  useEffect(() => {
    if (!open) {
      stopStream();
      setPending(false);
      setError('');
      return undefined;
    }

    let cancelled = false;

    async function startCamera() {
      setError('');

      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Live camera access is not available in this browser. You can use the device camera instead.');
        return;
      }

      setPending(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (problem) {
        if (cancelled) return;
        if (problem?.name === 'NotAllowedError') {
          setError('Camera permission was blocked. Allow camera access in your browser, then try again.');
        } else if (problem?.name === 'NotFoundError') {
          setError('No camera was found on this device.');
        } else {
          setError('GenuineNG could not open the camera. You can use the device camera instead.');
        }
      } finally {
        if (!cancelled) setPending(false);
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = event => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  async function takePhoto() {
    const video = videoRef.current;
    if (!video?.videoWidth || !video?.videoHeight) {
      setError('The camera is still starting. Wait a moment and try again.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) {
      setError('The photo could not be captured. Please try again.');
      return;
    }

    const safeLabel = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'product';
    const file = new File([blob], `${safeLabel}-${Date.now()}.jpg`, { type: 'image/jpeg' });
    stopStream();
    onCapture?.(file);
  }

  function useFallbackCamera(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    stopStream();
    onCapture?.(file);
  }

  if (!open) return null;

  return (
    <div className="camera-capture-backdrop" role="dialog" aria-modal="true" aria-labelledby="camera-capture-title" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose?.();
    }}>
      <section className="camera-capture-dialog">
        <button type="button" className="camera-capture-close" onClick={onClose} aria-label="Close camera">
          <Icon name="close" size={20} />
        </button>

        <div className="camera-capture-heading">
          <span className="eyebrow">CAMERA</span>
          <h2 id="camera-capture-title">Capture the {label.toLowerCase()}.</h2>
          <p>Keep the product label clear and fully inside the frame.</p>
        </div>

        <div className="camera-live-frame">
          <video ref={videoRef} autoPlay playsInline muted aria-label={`Live camera for ${label.toLowerCase()}`} />
          {pending && <div className="camera-live-state"><div className="demo-spinner" aria-hidden="true" /><span>Opening camera…</span></div>}
          {!pending && error && <div className="camera-live-state camera-live-error"><Icon name="info" size={22} /><span>{error}</span></div>}
          <span className="camera-guide camera-guide-top-left" />
          <span className="camera-guide camera-guide-top-right" />
          <span className="camera-guide camera-guide-bottom-left" />
          <span className="camera-guide camera-guide-bottom-right" />
        </div>

        <input
          ref={fallbackInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="visually-hidden"
          tabIndex="-1"
          onChange={useFallbackCamera}
        />

        <div className="camera-capture-actions">
          <button type="button" className="button primary" onClick={takePhoto} disabled={pending || Boolean(error)}>
            <Icon name="camera" size={18} /> Take photo
          </button>
          {error && (
            <button type="button" className="button secondary" onClick={() => fallbackInputRef.current?.click()}>
              <Icon name="camera" size={18} /> Use device camera
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
