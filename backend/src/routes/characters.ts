import { Router, Request, Response } from 'express';
import { Character } from '../models/Character';
import { DiscordUser } from '../models/DiscordUser';
import { Role } from '../models/Role';
import { Employee } from '../models/Employee';
import type { IPermissions } from '../models/Role';
import { isAuthenticated } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import { sendDiscordMessage } from '../utils/discord';
import { isDeveloper } from '../config/developers';

const router = Router();

const generateDoDId = (): string => {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
};

async function getEmptyPermissions(): Promise<IPermissions> {
    const sampleRole = await Role.findOne().lean();
    if (sampleRole?.permissions) {
        const empty = {} as IPermissions;
        for (const key of Object.keys(sampleRole.permissions) as (keyof IPermissions)[]) {
            empty[key] = false;
        }
        return empty;
    }
    return {
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
        hasMDTAccess: false,
        canEditUnitType: false,
        canEditStatus: false,
    };
}

async function getFullPermissions(): Promise<IPermissions> {
    const empty = await getEmptyPermissions();
    return Object.fromEntries(
        Object.keys(empty).map(k => [k, true])
    ) as unknown as IPermissions;
}

router.get('/', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const user = req.user as any;
        const characters = await Character.find({ discordId: user.id });
        res.json(characters);
    } catch (err) {
        console.error('[GET /characters]', err);
        res.status(500).json({ message: 'Błąd serwera' });
    }
});

router.get('/all', isAuthenticated, requirePermission('canEditCharacter'), async (_req: Request, res: Response) => {
    try {
        const characters = await Character.find().populate('roles').sort({ createdAt: -1 });

        const uniqueIds = [...new Set(characters.map(c => c.discordId))];

        const guildId = process.env.DISCORD_GUILD_ID!;
        const botToken = process.env.DISCORD_BOT_TOKEN!;

        const memberMap: Record<string, { avatar: string | null; username: string | null }> = {};

        await Promise.all(uniqueIds.map(async (id) => {
            try {
                const res = await fetch(
                    `https://discord.com/api/v10/guilds/${guildId}/members/${id}`,
                    { headers: { Authorization: `Bot ${botToken}` } }
                );
                if (res.ok) {
                    const member = await res.json() as { user: { avatar: string | null; username: string } };
                    memberMap[id] = {
                        avatar: member.user.avatar,
                        username: member.user.username,
                    };
                }
            } catch { /* ignoruj błędy dla pojedynczego użytkownika */ }
        }));

        const enriched = characters.map(c => ({
            ...c.toObject(),
            discordAvatarHash: memberMap[c.discordId]?.avatar ?? null,
            discordUsername: memberMap[c.discordId]?.username ?? c.discordUsername,
        }));

        res.json(enriched);
    } catch (err) {
        console.error('[GET /characters/all]', err);
        res.status(500).json({ message: 'Błąd serwera' });
    }
});

router.post('/', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const user = req.user as any;
        const { firstName, lastName } = req.body;

        if (!firstName?.trim() || !lastName?.trim()) {
            return res.status(400).json({ message: 'Imię i nazwisko jest wymagane!' });
        }

        const character = new Character({
            discordId: user.id,
            discordUsername: user.username ?? null,
            discordAvatarHash: user.avatar ?? null,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            roles: [],
        });

        await character.save();

        try {
            await Employee.create({
                characterId: character._id,
                firstName: character.firstName,
                lastName: character.lastName,
                doDId: generateDoDId(),
                status: 'active'
            });
        } catch (empErr) {
            console.error('[POST /characters] Uwaga: Teczka zostanie utworzona przy otwarciu listy HR:', empErr);
        }

        sendDiscordMessage(process.env.DISCORD_CHANNEL_ADMIN_LOGS!, {
            title: 'ℹ️ Nowa postać została utworzona',
            color: 0x5865F2,
            fields: [
                { name: 'Postać', value: `${character.firstName} ${character.lastName}`, inline: true },
                { name: 'Użytkownik Discord', value: `<@${user.id}>`, inline: true },
            ],
            timestamp: new Date().toISOString(),
        });

        return res.status(201).json(character);
    } catch (err) {
        console.error('[POST /characters] Krytyczny błąd podczas tworzenia postaci:', err);
        return res.status(500).json({ message: 'Błąd serwera podczas tworzenia postaci' });
    }
});

router.post('/select', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const user = req.user as any;
        const { characterId } = req.body;

        console.log(`[POST /characters/select] user: ${user.id}, characterId: ${characterId}`);

        const character = await Character.findOne({
            _id: characterId,
            discordId: user.id,
        }).populate('roles');

        if (!character) {
            console.warn(`[POST /characters/select] Postać nie znaleziona lub brak dostępu`);
            return res.status(403).json({ message: 'Brak dostępu do tej postaci' });
        }

        let permissions: IPermissions;

        if (isDeveloper(user.id)) {
            console.log(`[POST /characters/select] Developer detected — full permissions granted`);
            permissions = await getFullPermissions();
        } else {
            permissions = await getEmptyPermissions();

            const discordUser = await DiscordUser.findOne({ discordId: user.id });
            if (discordUser?.permissions) {
                for (const key of Object.keys(permissions) as (keyof IPermissions)[]) {
                    if ((discordUser.permissions as any)[key]) permissions[key] = true;
                }
            }

            for (const role of character.roles as any[]) {
                if (role.permissions) {
                    for (const key of Object.keys(permissions) as (keyof IPermissions)[]) {
                        if (role.permissions[key]) permissions[key] = true;
                    }
                }
            }
        }

        (req.session as any).activeCharacter = {
            id: character._id,
            _id: character._id,
            firstName: character.firstName,
            lastName: character.lastName,
            roles: character.roles,
            permissions,
            avatarUrl: character.avatarUrl ?? null,
        };

        // Gwarancja zapisu sesji przed wysłaniem odpowiedzi
        req.session.save((err) => {
            if (err) {
                console.error('[POST /characters/select] Błąd zapisu sesji:', err);
                return res.status(500).json({ message: 'Błąd zapisu sesji' });
            }
            console.log(`[POST /characters/select] Wybrano postać: ${character.firstName} ${character.lastName}`);
            return res.json((req.session as any).activeCharacter);
        });
    } catch (err) {
        console.error('[POST /characters/select]', err);
        res.status(500).json({ message: 'Błąd serwera' });
    }
});

router.delete('/select', isAuthenticated, (req: Request, res: Response) => {
    try {
        if ((req.session as any).activeCharacter) {
            delete (req.session as any).activeCharacter;
        }
        req.session.save((err) => {
            if (err) {
                console.error('[DELETE /characters/select] Błąd zapisu sesji:', err);
                return res.status(500).json({ message: 'Błąd zapisu sesji' });
            }
            return res.status(200).json({ message: 'Postać została odznaczona' });
        });
    } catch (err) {
        console.error('[DELETE /characters/select]', err);
        return res.status(500).json({ message: 'Błąd serwera' });
    }
});

router.put('/:id/avatar', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const user = req.user as any;
        const { avatarUrl } = req.body;
        const targetId = req.params.id;

        let character = await Character.findOne({ _id: targetId, discordId: user.id });

        if (!character) {
            const hasEditPerm = user.permissions?.canEditCharacter || user.permissions?.hasAdminAccess;
            if (hasEditPerm) {
                character = await Character.findById(targetId);
            }
        }

        if (!character) {
            const emp = await Employee.findById(targetId);
            if (emp) {
                character = await Character.findById(emp.characterId);
            }
        }

        if (!character) {
            return res.status(404).json({ message: 'Nie znaleziono postaci dla podanego ID' });
        }

        character.avatarUrl = avatarUrl?.trim() || null;
        await character.save();

        res.json(character);
    } catch (err) {
        console.error(`[PUT /characters/${req.params.id}/avatar]`, err);
        res.status(500).json({ message: 'Błąd serwera podczas aktualizacji avatara' });
    }
});

router.put('/:id', isAuthenticated, requirePermission('canEditCharacter'), async (req: Request, res: Response) => {
    try {
        const { firstName, lastName, avatarUrl } = req.body;

        if (!firstName?.trim() || !lastName?.trim()) {
            return res.status(400).json({ message: 'Imię i nazwisko są wymagane' });
        }

        const character = await Character.findByIdAndUpdate(
            req.params.id,
            {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                avatarUrl: avatarUrl?.trim() || null,
            },
            { returnDocument: 'after', runValidators: true }
        );

        if (!character) return res.status(404).json({ message: 'Postać nie znaleziona' });

        const user = req.user as any;
        sendDiscordMessage(process.env.DISCORD_CHANNEL_ADMIN_LOGS!, {
            title: '✏️ Dane postaci zostały zaktualizowane',
            color: 0xF39C12,
            fields: [
                { name: 'Postać', value: `${character.firstName} ${character.lastName}`, inline: true },
                { name: 'Zmienione przez', value: `<@${user.id}>`, inline: true },
            ],
            timestamp: new Date().toISOString(),
        });

        res.json(character);
    } catch (err) {
        console.error(`[PUT /characters/${req.params.id}]`, err);
        res.status(500).json({ message: 'Błąd serwera' });
    }
});

export default router;