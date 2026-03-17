import { sanitizeForLog } from './RequestContext.js';

const normalizeUserId = (userId) => {
    const parsed = Number(userId);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const normalizeTargetId = (targetId) => {
    if (targetId === null || targetId === undefined) {
        return null;
    }

    const parsed = Number(targetId);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export class SystemLogger {
    constructor(db) {
        this.db = db;
    }

    async write({
        userId = null,
        action,
        targetType = null,
        targetId = null,
        beforeData = null,
        afterData = null,
        ipAddress = null,
        metadata = null,
    }) {
        try {
            const normalizedAfterData = metadata
                ? {
                    ...(afterData && typeof afterData === 'object' ? afterData : { value: afterData }),
                    _meta: metadata,
                }
                : afterData;

            await this.db.query(
                `INSERT INTO audit_logs (
                    user_id,
                    action,
                    target_type,
                    target_id,
                    old_value,
                    new_value,
                    ip_address
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    normalizeUserId(userId),
                    action,
                    targetType,
                    normalizeTargetId(targetId),
                    beforeData ? JSON.stringify(sanitizeForLog(beforeData)) : null,
                    normalizedAfterData ? JSON.stringify(sanitizeForLog(normalizedAfterData)) : null,
                    ipAddress,
                ]
            );
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('SystemLogger write error:', error);
        }
    }

    async auth(userId, action, details, ipAddress = null) {
        return this.write({
            userId,
            action,
            targetType: 'auth',
            afterData: details,
            ipAddress,
        });
    }

    async business(userId, action, details, ipAddress = null) {
        return this.write({
            userId,
            action,
            targetType: 'business',
            afterData: details,
            ipAddress,
        });
    }

    async system(userId, action, details, ipAddress = null) {
        return this.write({
            userId,
            action,
            targetType: 'system',
            afterData: details,
            ipAddress,
        });
    }

    async error(userId, action, details, ipAddress = null, options = {}) {
        return this.write({
            userId,
            action,
            targetType: 'error',
            afterData: details,
            ipAddress,
            metadata: {
                severity: options.severity || 'error',
                source: options.source || 'server',
            },
        });
    }
}
