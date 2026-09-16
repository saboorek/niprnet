import { Router, Request, Response } from 'express';
import { Role } from '../models/Role';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

// --- DEDYKOWANY ENDPOINT DLA STOPNI (Dostępny dla wszystkich zalogowanych) ---
router.get('/ranks', isAuthenticated, async (_req: Request, res: Response) => {
    try {
        const ranks = await Role.find({ type: 'rank' }).select('_id name type icon').lean();
        res.json(ranks);
    } catch (error) {
        console.error('[GET /roles/ranks] Błąd podczas pobierania stopni:', error);
        res.status(500).json({ message: 'Błąd podczas pobierania listy stopni' });
    }
});

// --- PEŁNA LISTA RÓL (Wymaga odpowiednich uprawnień / dla admina) ---
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const userPermissions = (req.session as any)?.activeCharacter?.permissions
            || (req as any).user?.permissions;

        const hasAdminAccess = Boolean(userPermissions?.hasAdminAccess || userPermissions?.canManageRoles);

        if (!hasAdminAccess) {
            return res.status(403).json({ message: 'Brak uprawnień do przeglądania pełnej listy ról' });
        }

        const roles = await Role.find().lean();
        res.json(roles);
    } catch (error) {
        console.error('[GET /roles] Błąd podczas pobierania ról:', error);
        res.status(500).json({ message: 'Błąd podczas pobierania ról' });
    }
});

// --- TWORZENIE NOWEJ ROLI / RANGI ---
router.post('/', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const userPermissions = (req.session as any)?.activeCharacter?.permissions
            || (req as any).user?.permissions;

        const hasAdminAccess = Boolean(userPermissions?.hasAdminAccess || userPermissions?.canManageRoles);

        if (!hasAdminAccess) {
            return res.status(403).json({ message: 'Brak uprawnień do zarządzania rolami' });
        }

        const { name, type, icon, permissions } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Nazwa roli jest wymagana' });
        }

        const newRole = new Role({
            name: name.trim(),
            type: type || 'role',
            icon: icon || null,
            permissions: permissions || {},
        });

        await newRole.save();
        res.status(201).json(newRole);
    } catch (error) {
        console.error('[POST /roles] Błąd podczas tworzenia roli:', error);
        res.status(500).json({ message: 'Błąd podczas tworzenia roli' });
    }
});

// --- EDYCJA ROLI / RANGI ---
router.put('/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const userPermissions = (req.session as any)?.activeCharacter?.permissions
            || (req as any).user?.permissions;

        const hasAdminAccess = Boolean(userPermissions?.hasAdminAccess || userPermissions?.canManageRoles);

        if (!hasAdminAccess) {
            return res.status(403).json({ message: 'Brak uprawnień do edycji ról' });
        }

        const { name, type, icon, permissions } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Nazwa roli jest wymagana' });
        }

        const updatedRole = await Role.findByIdAndUpdate(
            req.params.id,
            {
                name: name.trim(),
                type: type || 'role',
                icon: icon || null,
                permissions: permissions || {},
            },
            { new: true }
        );

        if (!updatedRole) {
            return res.status(404).json({ message: 'Nie znaleziono wskazanej roli' });
        }

        res.json(updatedRole);
    } catch (error) {
        console.error('[PUT /roles/:id] Błąd podczas edycji roli:', error);
        res.status(500).json({ message: 'Błąd podczas aktualizacji roli' });
    }
});

// --- USUWANKO ROLI / RANGI ---
router.delete('/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const userPermissions = (req.session as any)?.activeCharacter?.permissions
            || (req as any).user?.permissions;

        const hasAdminAccess = Boolean(userPermissions?.hasAdminAccess || userPermissions?.canManageRoles);

        if (!hasAdminAccess) {
            return res.status(403).json({ message: 'Brak uprawnień do usuwania ról' });
        }

        const deletedRole = await Role.findByIdAndDelete(req.params.id);

        if (!deletedRole) {
            return res.status(404).json({ message: 'Nie znaleziono pozycji do usunięcia' });
        }

        res.json({ message: 'Pomyślnie usunięto pozycję' });
    } catch (error) {
        console.error('[DELETE /roles/:id] Błąd podczas usuwania roli:', error);
        res.status(500).json({ message: 'Błąd podczas usuwania roli' });
    }
});

export default router;