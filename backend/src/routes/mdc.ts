import { Router, Request, Response } from 'express';
import { Character } from '../models/Character';
import { Employee } from '../models/Employee';
import { MdcRecord } from '../models/MdcRecord';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

// ==========================================
// 1. WYSZUKIWARKA MDC (GET /api/mdc/search?query=...)
// ==========================================
router.get('/search', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const query = (req.query.query as string || '').trim();

        if (!query) {
            return res.status(400).json({ message: 'Brak frazy do wyszukania' });
        }

        const parts = query.split(/\s+/);
        let characterSearchFilter: any = {};

        if (parts.length === 1) {
            const regex = new RegExp(parts[0], 'i');
            characterSearchFilter = {
                $or: [
                    { firstName: regex },
                    { lastName: regex }
                ]
            };
        } else {
            const firstRegex = new RegExp(parts[0], 'i');
            const secondRegex = new RegExp(parts.slice(1).join(' '), 'i');

            characterSearchFilter = {
                $or: [
                    { firstName: firstRegex, lastName: secondRegex },
                    { firstName: secondRegex, lastName: firstRegex }
                ]
            };
        }

        const matchingCharacters = await Character.find(characterSearchFilter).populate('roles').lean();

        if (matchingCharacters.length === 0) {
            return res.json([]);
        }

        const characterIds = matchingCharacters.map(c => c._id);

        // Pobieramy teczki pracownicze (pobieramy phone oraz doDId) oraz dedykowane wpisy MDC
        const [employees, mdcRecords] = await Promise.all([
            Employee.find({ characterId: { $in: characterIds } }).select('characterId phone doDId dodId').lean(),
            MdcRecord.find({ characterId: { $in: characterIds } }).sort({ createdAt: -1 }).lean()
        ]);

        const results = matchingCharacters.map(char => {
            const empData = employees.find(e => e.characterId.toString() === char._id.toString());
            const charRecords = mdcRecords.filter(r => r.characterId.toString() === char._id.toString());

            const assignedRoles = (char.roles as any[]) || [];
            const rankRole = assignedRoles.find(r => r.type === 'rank');
            const rankName = rankRole ? rankRole.name : 'Brak rangi';

            // Pobieramy doDId z modelu Employee lub bezpośrednio z Character
            const resolvedDoDId = empData?.doDId || (empData as any)?.dodId || (char as any).doDId || (char as any).dodId || null;

            return {
                _id: char._id,
                characterId: char._id,
                firstName: char.firstName,
                lastName: char.lastName,
                avatarUrl: char.avatarUrl ?? null,
                rank: rankName,
                doDId: resolvedDoDId,
                phone: empData?.phone ?? null,
                records: charRecords.map(r => ({
                    _id: r._id,
                    type: r.type,
                    description: r.description,
                    createdAt: r.createdAt,
                    createdBy: r.createdBy
                }))
            };
        });

        res.json(results);
    } catch (error) {
        console.error('[GET /api/mdc/search] Błąd serwera:', error);
        res.status(500).json({ message: 'Błąd podczas wyszukiwania w bazie MDC' });
    }
});

// ==========================================
// 2. DODAWANIE WPISU W KARTOTECE MDC (POST /api/mdc/employee/:characterId/record)
// ==========================================
router.post('/employee/:characterId/record', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const { characterId } = req.params;
        const { type, description } = req.body;

        if (!description || !type) {
            return res.status(400).json({ message: 'Typ oraz opis wpisu są wymagane' });
        }

        const character = await Character.findById(characterId);
        if (!character) {
            return res.status(404).json({ message: 'Nie znaleziono postaci w bazie danych' });
        }

        const activeUser = (req.session as any)?.activeCharacter?.name || (req as any).user?.username || 'System';

        await MdcRecord.create({
            characterId: character._id,
            type,
            description,
            createdBy: activeUser
        });

        // Zwracamy całą powiązaną listę wpisów postaci
        const updatedRecords = await MdcRecord.find({ characterId: character._id })
            .sort({ createdAt: -1 })
            .lean();

        const formattedRecords = updatedRecords.map(r => ({
            _id: r._id,
            type: r.type,
            description: r.description,
            createdAt: r.createdAt,
            createdBy: r.createdBy
        }));

        res.json(formattedRecords);
    } catch (error) {
        console.error(`[POST /api/mdc/employee/${req.params.characterId}/record] Błąd:`, error);
        res.status(500).json({ message: 'Błąd podczas dodawania wpisu do kartoteki' });
    }
});

export default router;