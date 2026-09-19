import { useEffect, useRef, useState } from 'react';

function Eye({ side = 'left' }) {
  return (
    <span className={`auth-mascot-eye auth-mascot-eye-${side}`} aria-hidden="true">
      <span className="auth-mascot-pupil" />
    </span>
  );
}

export default function AuthMascots({ focusTarget = '', isTyping = false, privacyMode = false }) {
  const stageRef = useRef(null);
  const [look, setLook] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let frame = 0;

    function move(event) {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const stage = stageRef.current;
        if (!stage) return;
        const box = stage.getBoundingClientRect();
        const centerX = box.left + box.width * 0.52;
        const centerY = box.top + box.height * 0.48;
        const dx = event.clientX - centerX;
        const dy = event.clientY - centerY;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const max = 5.5;
        const strength = Math.min(max, distance / 70);
        setLook({
          x: (dx / distance) * strength,
          y: (dy / distance) * strength,
        });
      });
    }

    window.addEventListener('pointermove', move, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', move);
    };
  }, []);

  const watchingInput = focusTarget === 'email' || focusTarget === 'password';
  const className = [
    'auth-mascot-stage',
    watchingInput ? 'is-watching-input' : '',
    focusTarget ? `focus-${focusTarget}` : '',
    isTyping ? 'is-typing' : '',
    privacyMode ? 'privacy-mode' : '',
  ].filter(Boolean).join(' ');

  const eyeLook = privacyMode ? { x: -5.5, y: -1.5 } : look;

  return (
    <div
      ref={stageRef}
      className={className}
      style={{ '--eye-x': `${eyeLook.x}px`, '--eye-y': `${eyeLook.y}px` }}
      aria-hidden="true"
    >
      <div className="auth-mascot-brand-mark">
        <img src="/icons/favicon.svg" alt="" />
      </div>

      <div className="auth-mascot-ground" />

      <div className="auth-mascot auth-mascot-left">
        <div className="auth-mascot-face">
          <Eye side="left" />
          <Eye side="right" />
        </div>
      </div>

      <div className="auth-mascot auth-mascot-back">
        <div className="auth-mascot-face">
          <Eye side="left" />
          <Eye side="right" />
        </div>
      </div>

      <div className="auth-mascot auth-mascot-main">
        <span className="auth-mascot-fedora" aria-hidden="true">
          <span className="auth-mascot-fedora-crown" />
          <span className="auth-mascot-fedora-band" />
          <span className="auth-mascot-fedora-brim" />
        </span>
        <div className="auth-mascot-face">
          <Eye side="left" />
          <Eye side="right" />
          <span className="auth-mascot-mouth" />
        </div>
      </div>

      <div className="auth-mascot auth-mascot-small">
        <div className="auth-mascot-face auth-mascot-face-glasses">
          <span className="auth-mascot-glasses" aria-hidden="true">
            <span className="auth-mascot-glasses-bridge" />
          </span>
          <Eye side="left" />
          <Eye side="right" />
        </div>
      </div>
    </div>
  );
}
