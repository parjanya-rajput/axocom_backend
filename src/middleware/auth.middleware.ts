import { Request, Response, NextFunction } from 'express';
import { decodeAuthToken } from '../utils/jwt';
/**
 * Optional JWT verification for GraphQL.
 * If Authorization: Bearer <token> is present, verifies and sets req.user.
 * If missing or invalid, leaves req.user undefined and continues (no throw).
 * Resolvers use context.user and requireAuth/requireAdmin to enforce access.
 */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            next();
            return;
        }
        const token = authHeader.substring(7);
        req.user = decodeAuthToken(token);
        next();
    } catch {
        next();
    }
};