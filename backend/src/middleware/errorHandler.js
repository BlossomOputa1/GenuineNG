/**
 * Centralized error handler. Must be registered LAST, after all routes.
 * Never leaks stack traces or internals to the client in production.
 */
export function errorHandler(err, req, res, next) {
  console.error(err); // full details stay server-side

  const isDev = process.env.NODE_ENV !== 'production';

  res.status(err.statusCode || 500).json({
    status: 'error',
    reason: 'Something went wrong processing this request.',
    ...(isDev && { detail: err.message }),
  });
}
