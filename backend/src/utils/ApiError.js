import { buildRequestContext, logHandledError } from './RequestContext.js';

export const sendError = (res, status, message, req = null, extra = {}) => {
    const payload = {
        message,
        request_id: req?.requestId || null,
        ...extra,
    };

    return res.status(status).json(payload);
};

export const handleControllerError = async ({
    logger,
    req,
    res,
    error,
    action,
    message = 'Error interno del servidor',
    status = 500,
    details = {},
}) => {
    await logHandledError({
        logger,
        req,
        action,
        error,
        details: buildRequestContext(req, details),
    });

    return sendError(res, status, message, req);
};
