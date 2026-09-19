import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
export default function ScanCameraView({
  photos,
  onPhoto,
  onRemove,
  onRead,
  busy,
  error,
  progress,
  onCancel,
  launcherMode = false
}) {
  const uploadInput = useRef(null);
  const cameraInput = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const attemptRef = useRef(0);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraPending, setCameraPending] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [dragging, setDragging] = useState(false);
  function stopCamera() {
    attemptRef.current += 1;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
    setCameraPending(false);
  }
  useEffect(() => () => {
    attemptRef.current += 1;
    streamRef.current?.getTracks().forEach(track => track.stop());
  }, []);
  useEffect(() => {
    if (cameraOpen && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => setCameraError('Tap the video to start the camera.'));
    }
  }, [cameraOpen]);
  async function openCamera() {
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraInput.current.click();
      return;
    }
    const attempt = ++attemptRef.current;
    setCameraPending(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: 'environment'
          },
          width: {
            ideal: 1920
          }
        },
        audio: false
      });
      if (attempt !== attemptRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      streamRef.current = stream;
      setCameraOpen(true);
    } catch (problem) {
      if (attempt !== attemptRef.current) return;
      setCameraError(problem.name === 'NotAllowedError' ? (launcherMode ? 'Camera access was not allowed. Upload the front image instead.' : 'Camera access was not allowed. Upload a photo or type the label details below.') : (launcherMode ? 'The camera could not open. Upload the front image instead.' : 'The camera could not open. You can upload a photo or type the details instead.'));
    } finally {
      if (attempt === attemptRef.current) setCameraPending(false);
    }
  }
  async function capture() {
    const video = videoRef.current;
    if (!video?.videoWidth) {
      setCameraError('The camera is still starting. Try taking the photo again.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) {
      setCameraError('The photo could not be captured. Please try again.');
      return;
    }
    stopCamera();
    onPhoto(new File([blob], 'label-photo.jpg', {
      type: 'image/jpeg'
    }));
  }
  function selectPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onPhoto(file);
  }
  return <section className="capture-panel" aria-label="Photograph your product label">
    <input ref={uploadInput} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" tabIndex="-1" onChange={selectPhoto} aria-label="Upload a label photo" />
    <input ref={cameraInput} className="visually-hidden" type="file" accept="image/*" capture="environment" tabIndex="-1" onChange={selectPhoto} aria-label="Take a label photo" />
    {cameraOpen ? <div className="camera-live" onKeyDown={event => {
      if (event.key === 'Escape') stopCamera();
    }}>
      <video ref={videoRef} autoPlay playsInline muted aria-label="Live camera view" onClick={() => videoRef.current?.play()} />
      <div className="camera-actions"><button type="button" className="button primary" onClick={capture}><Icon name="camera" />Take photo</button><button type="button" className="button secondary" onClick={stopCamera}>Cancel</button></div>
      <p>Keep all the label text inside the photo.</p>
    </div> : <>
      <div className={`capture-area ${dragging ? 'is-dragging' : ''} ${photos.length ? 'has-photos' : ''}`} onDragOver={event => {
        event.preventDefault();
        if (!busy) setDragging(true);
      }} onDragLeave={() => setDragging(false)} onDrop={event => {
        event.preventDefault();
        setDragging(false);
        if (!busy && photos.length < 2 && event.dataTransfer.files[0]) onPhoto(event.dataTransfer.files[0]);
      }}>
        {photos.length ? <div className="photo-grid">{photos.map((photo, index) => <figure className="photo-preview" key={photo.id}><img src={photo.url} alt={`Label photo ${index + 1} for text extraction`} /><figcaption><span>{index === 0 ? '01 / Main label' : '02 / Side or expiry panel'}</span><button type="button" className="icon-button" disabled={busy} onClick={() => onRemove(photo.id)} aria-label={`Remove photo ${index + 1}`}><Icon name="close" size={16} /></button></figcaption></figure>)}</div> : <div className="viewfinder">
          <span className="corner top-left" /><span className="corner top-right" /><span className="corner bottom-left" /><span className="corner bottom-right" />
          <Icon name="scan" size={42} />
          <h2>{launcherMode ? 'Start with the front label.' : 'Start with a clear label.'}</h2>
          <p>{launcherMode ? <>Snap or upload the front of the product.<br />We’ll ask for the back image next.</> : <>Photograph the printed details.<br />You’ll review them before we check.</>}</p>
        </div>}
      </div>
      {busy ? <div className="ocr-progress" role="status" aria-live="polite"><div><strong>{progress?.status || 'Preparing your photo'}</strong><span className="mono">{Math.round((progress?.progress || 0) * 100)}%</span></div><progress max="1" value={progress?.progress || 0} aria-label="Label reading progress" /><p>Reading on your device. The first scan may take a little longer.</p><button type="button" className="text-button" onClick={onCancel}>Cancel and type instead</button></div> : <div className="capture-actions">
        {photos.length ? <><button type="button" className="button primary" onClick={onRead}>Read label text <Icon name="arrow" /></button>{photos.length < 2 && <button type="button" className="button secondary" onClick={openCamera} disabled={cameraPending}><Icon name="plus" />Add second photo</button>}{photos.length < 2 && <button type="button" className="text-button" onClick={() => uploadInput.current.click()}>Upload side panel</button>}</> : <><button type="button" className="button primary" onClick={openCamera} disabled={cameraPending}><Icon name="camera" />{cameraPending ? 'Opening camera…' : 'Open camera'}</button><button type="button" className="button secondary" onClick={() => uploadInput.current.click()}><Icon name="upload" />Upload a photo</button></>}
        {cameraPending && <button type="button" className="text-button" onClick={stopCamera}>Cancel camera request</button>}
      </div>}
    </>}
    {(cameraError || error) && <div className="inline-notice" role="alert"><Icon name="info" /><p>{cameraError || error}</p></div>}
  </section>;
}
