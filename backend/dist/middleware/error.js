import { errorResponse } from '@/utils/responses';
export const errorHandler = (err, req, res, _next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    if (process.env['NODE_ENV'] === 'development') {
        console.error('Error:', {
            message: err.message,
            stack: err.stack,
            url: req.url,
            method: req.method,
            body: req.body,
            user: req.user,
        });
    }
    errorResponse(res, message, statusCode, process.env['NODE_ENV'] === 'development' ? err.stack : undefined);
};
export const notFoundHandler = (req, res) => {
    errorResponse(res, `Route ${req.originalUrl} not found`, 404);
};
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
//# sourceMappingURL=error.js.map