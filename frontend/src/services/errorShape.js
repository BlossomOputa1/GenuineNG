export function getApiErrorMessage(payload) {
  if (!payload) return '';

  if (typeof payload === 'string') return payload;

  if (typeof payload?.message === 'string' && payload.message.trim()) {
    return payload.message.trim();
  }

  if (typeof payload?.reason === 'string' && payload.reason.trim()) {
    return payload.reason.trim();
  }

  if (payload?.error && typeof payload.error.message === 'string' && payload.error.message.trim()) {
    return payload.error.message.trim();
  }

  if (payload?.error && typeof payload.error.reason === 'string' && payload.error.reason.trim()) {
    return payload.error.reason.trim();
  }

  if (Array.isArray(payload?.details) && payload.details.length > 0) {
    const message = payload.details.filter(Boolean).join(' ');
    if (message) return message;
  }

  return '';
}

export function getFallbackReadFailureMessage() {
  return "We couldn't read this label. Please enter the details manually.";
}
