import 'express-serve-static-core';
import 'express-session';

declare module 'express-serve-static-core' {
    interface Request {
        user?: {
            id: string;
            username?: string;
            avatarURL?: string;
        };
    }
}

declare module 'express-session' {
    interface SessionData {
        activeCharacter?: {
            id: string;
            firstName: string;
            lastName: string;
            roles: string[];
        };
    }
}