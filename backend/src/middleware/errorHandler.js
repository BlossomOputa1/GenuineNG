/**
 * Centralized error handler. Must be registered LAST, after all routes.
 * Never leaks stack traces or internals to the client in production.
 */
export function errorHandler(err, req, res, next) {
  console.error(err); // full details stay server-side

  if (err?.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        status: 'error',
        reason: 'Each image must be 8 MB or smaller.',
      });
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        status: 'error',
        reason: 'Only front and back images are accepted.',
      });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        status: 'error',
        reason: 'Only one front image and one back image are accepted.',
      });
    }

    return res.status(400).json({
      status: 'error',
      reason: 'The image upload could not be processed.',
    });
  }

  const isDev = process.env.NODE_ENV !== 'production';
  const statusCode = err.statusCode || 500;

  return res.status(statusCode).json({
    status: 'error',
    reason: statusCode < 500 ? err.message : 'Something went wrong processing this request.',
    ...(isDev && statusCode >= 500 && { detail: err.message }),
  });
}
