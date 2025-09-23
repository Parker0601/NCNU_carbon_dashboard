export const successResponse = (res, data, message = 'Success', statusCode = 200) => {
    const response = {
        success: true,
        message,
        data,
        timestamp: new Date().toISOString(),
    };
    return res.status(statusCode).json(response);
};
export const errorResponse = (res, message = 'Error occurred', statusCode = 500, error) => {
    const response = {
        success: false,
        message,
        ...(error && { error }),
        timestamp: new Date().toISOString(),
    };
    return res.status(statusCode).json(response);
};
export const validationErrorResponse = (res, message = 'Validation error', errors) => {
    return errorResponse(res, message, 400, errors);
};
export const notFoundResponse = (res, message = 'Resource not found') => {
    return errorResponse(res, message, 404);
};
export const unauthorizedResponse = (res, message = 'Unauthorized') => {
    return errorResponse(res, message, 401);
};
export const forbiddenResponse = (res, message = 'Forbidden') => {
    return errorResponse(res, message, 403);
};
//# sourceMappingURL=responses.js.map