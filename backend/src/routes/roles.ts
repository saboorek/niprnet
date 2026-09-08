import { Router, Request, Response } from 'express';
import { Role } from '../models/Role';
import { Character } from '../models/Character';
import { DiscordUser } from '../models/DiscordUser';
import { isAuthenticated } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import { sendDiscordMessage } from '../utils/discord';
import mongoose from 'mongoose';

const router = Router();

router.get('/', isAuthenticated, requirePermission('hasAdminAccess'), async (_req: Request, res: Response) => {
    try {
        const roles = await Role.find().sort({ createdAt: -1 });
        res.json(roles);
    } catch {
        res.status(500).json({ message: 'Błąd serwera' });
    }
});

router.post('/', isAuthenticated, requirePermission('canManagePermission'), async (req: Request, res: Response) => {
    try {
        const { name, type, icon, permissions } = req.body;
        if (!name?.trim()) {
            return res.status(400).json({ message: 'Nazwa roli jest wymagana' });
        }

        const existing = await Role.findOne({ name: name.trim() });
        if (existing) {
            return res.status(400).json({ message: 'Rola o tej nazwie już istnieje' });
        }

        const role = new Role({
            name: name.trim(),
            type: type ?? 'role',
            icon: icon ?? null,
            permissions: permissions ?? {}
        });
        await role.save();

        const user = req.user as any;
        const itemTypeLabel = role.type === 'rank' ? 'Ranga' : 'Rola';

        sendDiscordMessage(process.env.DISCORD_CHANNEL_ADMIN_LOGS!, {
            title: `🛡️ Nowy wpis (${itemTypeLabel}) został utworzony`,
            color: 0x57F287,
            fields: [
                { name: 'Nazwa', value: role.name, inline: true },
                { name: 'Typ', value: itemTypeLabel, inline: true },
                { name: 'Utworzona przez', value: `<@${user.id}>`, inline: false },
            ],
            timestamp: new Date().toISOString(),
        });

        res.status(201).json(role);
    } catch {
        res.status(500).json({ message: 'Błąd serwera' });
    }
});

router.put('/:id', isAuthenticated, requirePermission('canManagePermission'), async (req: Request, res: Response) => {
    try {
        const { name, type, icon, permissions } = req.body;
        const role = await Role.findByIdAndUpdate(
            req.params.id,
            { name, type, icon, permissions },
            { returnDocument: 'after', runValidators: true }
        );

        if (!role) return res.status(404).json({ message: 'Rola nie została znaleziona' });

        const user = req.user as any;
        const itemTypeLabel = role.type === 'rank' ? 'Ranga' : 'Rola';

        sendDiscordMessage(process.env.DISCORD_CHANNEL_ADMIN_LOGS!, {
            title: `✏️ Wpis (${itemTypeLabel}) został zaktualizowany`,
            color: 0xF39C12,
            fields: [
                { name: 'Nazwa', value: role.name, inline: true },
                { name: 'Typ', value: itemTypeLabel, inline: true },
                { name: 'Edytowana przez', value: `<@${user.id}>`, inline: false },
            ],
            timestamp: new Date().toISOString(),
        });

        res.json(role);
    } catch {
        res.status(500).json({ message: 'Błąd serwera' });
    }
});

router.delete('/:id', isAuthenticated, requirePermission('canManagePermission'), async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const role = await Role.findByIdAndDelete(id);
        if (!role) return res.status(404).json({ message: 'Rola nie znaleziona' });

        const roleObjectId = new mongoose.Types.ObjectId(id);
        await Character.updateMany(
            { roles: roleObjectId },
            { $pull: { roles: roleObjectId } }
        );

        const user = req.user as any;
        sendDiscordMessage(process.env.DISCORD_CHANNEL_ADMIN_LOGS!, {
            title: '🗑️ Pozycja została usunięta',
            color: 0x95A5A6,
            fields: [
                { name: 'Nazwa', value: role.name, inline: false },
                { name: 'Usunięta przez', value: `<@${user.id}>`, inline: false },
            ],
            timestamp: new Date().toISOString(),
        });

        res.json({ message: 'Rola usunięta' });
    } catch {
        res.status(500).json({ message: 'Błąd serwera' });
    }
});

router.post('/assign', isAuthenticated, requirePermission('canManagePermission'), async (req: Request, res: Response) => {
    try {
        const { characterId, roleId } = req.body;
        const character = await Character.findByIdAndUpdate(
            characterId,
            { $addToSet: { roles: roleId } },
            { new: true }
        ).populate('roles');

        if (!character) return res.status(404).json({ message: 'Postać nie znaleziona' });
        res.json(character);
    } catch {
        res.status(500).json({ message: 'Błąd serwera' });
    }
});

router.post('/revoke', isAuthenticated, requirePermission('canManagePermission'), async (req: Request, res: Response) => {
    try {
        const { characterId, roleId } = req.body;
        const character = await Character.findByIdAndUpdate(
            characterId,
            { $pull: { roles: roleId } },
            { new: true }
        ).populate('roles');

        if (!character) return res.status(404).json({ message: 'Postać nie znaleziona' });
        res.json(character);
    } catch {
        res.status(500).json({ message: 'Błąd serwera' });
    }
});

router.get('/discord-users', isAuthenticated, requirePermission('canManagePermission'), async (_req, res) => {
    try {
        const users = await DiscordUser.find();
        res.json(users);
    } catch {
        res.status(500).json({ message: 'Błąd serwera' });
    }
});

router.put('/discord-users/:discordId', isAuthenticated, requirePermission('canManagePermission'), async (req: Request, res: Response) => {
    try {
        const { permissions } = req.body;
        const discordUser = await DiscordUser.findOneAndUpdate(
            { discordId: req.params.discordId },
            { permissions },
            { new: true, upsert: true }
        );

        const user = req.user as any;
        sendDiscordMessage(process.env.DISCORD_CHANNEL_ADMIN_LOGS!, {
            title: '🔑 Uprawnienia konta Discord zaktualizowane',
            color: 0xE74C3C,
            fields: [
                { name: 'Konto', value: `<@${req.params.discordId}>`, inline: false },
                { name: 'Zmienione przez', value: `<@${user.id}>`, inline: false },
            ],
            timestamp: new Date().toISOString(),
        });

        res.json(discordUser);
    } catch {
        res.status(500).json({ message: 'Błąd serwera' });
    }
});

export default router;