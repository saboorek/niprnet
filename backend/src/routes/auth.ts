import { Router, Request, Response } from 'express';
import passport from 'passport';
import { Character } from '../models/Character';
import { DiscordUser } from '../models/DiscordUser';
import { isDeveloper } from '../config/developers';
import type { IPermissions } from '../models/Role';

const router = Router();

const getFrontendUrl = () => process.env.FRONTEND_URL ?? 'http://localhost:5173';

async function hasRequiredRole(discordUserId: string): Promise<boolean> {
    const guildId  = process.env.DISCORD_GUILD_ID!;
    const botToken = process.env.DISCORD_BOT_TOKEN!;
    const roleId   = process.env.DISCORD_REQUIRED_ROLE_ID!;

    try {
        const res = await fetch(
            `https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}`,
            { headers: { Authorization: `Bot ${botToken}` } }
        );
        if (!res.ok) return false;
        const member = await res.json() as { roles: string[] };
        return member.roles.includes(roleId);
    } catch {
        return false;
    }
}

async function recalculatePermissions(discordId: string, characterId: string): Promise<IPermissions | null> {
    const character = await Character.findOne({
        _id: characterId,
        discordId,
    }).populate('roles');

    if (!character) return null;

    const empty: IPermissions = {
        hasAdminAccess: false,
        canManagePermission: false,
        hasStatisticAccess: false,
        hasHumanResourcesAccess: false,
        hasEmployeeAccess: false,
        hasStructureAccess: false,
        hasAbsenceAccess: false,
        canEditCharacter: false,
        canEditRibbons: false,
        canAddAbsence: false,
        canRemoveAbsence: false,
        canAddReprimands: false,
        canRemoveReprimands: false,
        canAddPraises: false,
        canRemovePraises: false,
        canAddPromotions: false,
        canRemovePromotions: false,
        hasSecurityForcesAccess: false,
        hasReportAccess: false,
        hasFleetAccess: false,
        hasDBIDSAccess: false,
        canAddPass: false,
        canRemovePass: false,
        canAddReport: false,
        canRemoveReport: false,
        canAddDemotes: false,
        canRemoveDemotes: false,
        canAddStructure: false,
        canRemoveStructure: false,
        canEditStructure: false,
    };

    if (isDeveloper(discordId)) {
        return Object.fromEntries(Object.keys(empty).map(k => [k, true])) as unknown as IPermissions;
    }

    const discordUser = await DiscordUser.findOne({ discordId });
    if (discordUser?.permissions) {
        for (const key of Object.keys(empty) as (keyof IPermissions)[]) {
            if ((discordUser.permissions as any)[key]) empty[key] = true;
        }
    }

    for (const role of character.roles as any[]) {
        if (role.permissions) {
            for (const key of Object.keys(empty) as (keyof IPermissions)[]) {
                if (role.permissions[key]) empty[key] = true;
            }
        }
    }

    return empty;
}

router.get('/discord', passport.authenticate('discord'));

router.get(
    '/discord/callback',
    passport.authenticate('discord', {
        failureRedirect: `${getFrontendUrl()}/login`,
    }),
    async (req: Request, res: Response) => {
        const user = req.user as any;

        await Character.updateMany(
            { discordId: user.id },
            {
                discordUsername: user.username ?? null,
                discordAvatarHash: user.avatar ?? null,
            }
        );

        res.redirect(`${getFrontendUrl()}/dashboard`);
    }
);

router.get('/session', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            message: 'Brak aktywnej sesji',
            isAuthenticated: false,
        });
    }

    const user = req.user as any;
    const authorized = await hasRequiredRole(user.id);
    const sessionCharacter = (req.session as any).activeCharacter ?? null;

    let activeCharacter = sessionCharacter;

    if (sessionCharacter?._id) {
        const freshPermissions = await recalculatePermissions(user.id, sessionCharacter._id);
        if (freshPermissions) {
            activeCharacter = { ...sessionCharacter, permissions: freshPermissions };
            (req.session as any).activeCharacter = activeCharacter;
        } else {
            (req.session as any).activeCharacter = null;
            activeCharacter = null;
        }
    }

    res.json({
        user,
        isAuthenticated: true,
        authorized,
        activeCharacter,
    });
});

router.post('/logout', (req: Request, res: Response) => {
    req.logout((err) => {
        if (err) return res.status(500).json({ message: 'Failed to log out' });
        req.session.destroy((err) => {
            if (err) return res.status(500).json({ message: 'Failed to destroy session' });
            res.clearCookie('connect.sid');
            return res.status(200).json({ message: 'Logged out successfully' });
        });
    });
});

export default router;