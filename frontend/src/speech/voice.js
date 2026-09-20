let activeUtterance = null;

export function speechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

export function stopSpeech() {
  if (!speechSupported()) return;
  window.speechSynthesis.cancel();
  activeUtterance = null;
}

function preferredVoice() {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find(voice => /^en-NG$/i.test(voice.lang)) ||
    voices.find(voice => /^en-GB$/i.test(voice.lang)) ||
    voices.find(voice => /^en/i.test(voice.lang)) ||
    null
  );
}

export function speakResult(result, { onEnd } = {}) {
  if (!speechSupported()) throw new Error('Read aloud is not available in this browser.');
  stopSpeech();
  const warningText = result.warnings?.length
    ? `Warning. ${result.warnings.map(item => item.reason).join(' ')}`
    : '';
  const scoreText = result.verificationScore === null
    ? 'There was not enough information to calculate a verification score.'
    : `Verification score ${result.verificationScore} percent. ${result.matchedChecks} of ${result.totalChecks} checks matched.`;
  const checkText = (result.checks || [])
    .map(check => `${check.title}. ${check.status.replace('_', ' ')}. ${check.reason}`)
    .join(' ');
  const text = [
    `GenuineNG result for ${result.fields?.productName || 'this product'}.`,
    warningText,
    scoreText,
    checkText,
    `Recommendation. ${result.recommendation}`,
    `Limit. ${result.limitation}`,
  ].filter(Boolean).join(' ');

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-NG';
  const voice = preferredVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = 0.94;
  utterance.pitch = 1;
  utterance.onend = () => {
    activeUtterance = null;
    onEnd?.();
  };
  utterance.onerror = () => {
    activeUtterance = null;
    onEnd?.();
  };
  activeUtterance = utterance;
  window.speechSynthesis.speak(utterance);
  return utterance;
}
