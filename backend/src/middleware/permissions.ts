import { Request, Response, NextFunction } from "express";
import type { IPermissions } from '../models/Role';

type Permission = keyof IPermissions;

export const requirePermission = (permission: Permission) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const activeCharacter = (req.session as any).activeCharacter;

        if (!activeCharacter) {
            res.status(403).json({ message: 'Brak aktywnej postaci' });
            return;
        }

        if (!activeCharacter.permissions?.[permission]) {
            res.status(403).json({ message: 'Brak uprawnień' });
            return;
        }

        next();
    };
};