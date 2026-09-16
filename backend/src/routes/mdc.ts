import { Router, Request, Response } from 'express';
import { Character } from '../models/Character';
import { Employee } from '../models/Employee';
import { MdcRecord } from '../models/MdcRecord';
import { LegalCode } from '../models/LegalCode';
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
                    amount: (r as any).amount ?? undefined,
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
        const userPermissions = (req.session as any)?.activeCharacter?.permissions
            || (req as any).user?.permissions;

        const hasAccess = Boolean(userPermissions?.canAddMDCRecord || userPermissions?.hasAdminAccess);

        if (!hasAccess) {
            return res.status(403).json({ message: 'Brak uprawnień do dodawania wpisów w MDC' });
        }

        const { characterId } = req.params;
        const { type, description, amount } = req.body;

        if (!description || !type) {
            return res.status(400).json({ message: 'Typ oraz opis wpisu są wymagane' });
        }

        const character = await Character.findById(characterId);
        if (!character) {
            return res.status(404).json({ message: 'Nie znaleziono postaci w bazie danych' });
        }

        const activeUser = (req.session as any)?.activeCharacter?.name
            || ((req.session as any)?.activeCharacter?.firstName ? `${(req.session as any).activeCharacter.firstName} ${(req.session as any).activeCharacter.lastName}` : null)
            || (req as any).user?.username
            || 'System';

        await MdcRecord.create({
            characterId: character._id,
            type,
            description,
            amount: type === 'Cytacja' && amount !== undefined && amount !== null ? Number(amount) : undefined,
            createdBy: activeUser
        });

        const updatedRecords = await MdcRecord.find({ characterId: character._id })
            .sort({ createdAt: -1 })
            .lean();

        const formattedRecords = updatedRecords.map(r => ({
            _id: r._id,
            type: r.type,
            description: r.description,
            amount: (r as any).amount ?? undefined,
            createdAt: r.createdAt,
            createdBy: r.createdBy
        }));

        res.json(formattedRecords);
    } catch (error) {
        console.error(`[POST /api/mdc/employee/${req.params.characterId}/record] Błąd:`, error);
        res.status(500).json({ message: 'Błąd podczas dodawania wpisu do kartoteki' });
    }
});

// ==========================================
// 3. USUWANIE WPISU Z KARTOTEKI MDC (DELETE /api/mdc/employee/:characterId/record/:recordId)
// ==========================================
router.delete('/employee/:characterId/record/:recordId', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const userPermissions = (req.session as any)?.activeCharacter?.permissions
            || (req as any).user?.permissions;

        const hasAccess = Boolean(userPermissions?.canRemoveMDCRecord || userPermissions?.canRemoveRecord || userPermissions?.hasAdminAccess);

        if (!hasAccess) {
            return res.status(403).json({ message: 'Brak uprawnień do usuwania wpisów z MDC' });
        }

        const { characterId, recordId } = req.params;

        const deletedRecord = await MdcRecord.findOneAndDelete({
            _id: recordId,
            characterId: characterId
        });

        if (!deletedRecord) {
            return res.status(404).json({ message: 'Nie znaleziono podanego wpisu w kartotece' });
        }

        const updatedRecords = await MdcRecord.find({ characterId })
            .sort({ createdAt: -1 })
            .lean();

        const formattedRecords = updatedRecords.map(r => ({
            _id: r._id,
            type: r.type,
            description: r.description,
            amount: (r as any).amount ?? undefined,
            createdAt: r.createdAt,
            createdBy: r.createdBy
        }));

        res.json(formattedRecords);
    } catch (error) {
        console.error(`[DELETE /api/mdc/employee/${req.params.characterId}/record/${req.params.recordId}] Błąd:`, error);
        res.status(500).json({ message: 'Błąd podczas usuwania wpisu z kartoteki' });
    }
});

// ==========================================
// 4. POBIERANIE SŁOWNIKA PRZEPISÓW (GET /api/mdc/legal-codes)
// ==========================================
router.get('/legal-codes', isAuthenticated, async (_req: Request, res: Response) => {
    try {
        const legalCodes = await LegalCode.find().sort({ code: 1 }).lean();
        res.json(legalCodes);
    } catch (error) {
        console.error('[GET /api/mdc/legal-codes] Błąd serwera:', error);
        res.status(500).json({ message: 'Błąd podczas pobierania bazy przepisów' });
    }
});

// ==========================================
// 5. DODAWANIE PRZEPISU DO SŁOWNIKA (POST /api/mdc/legal-codes)
// ==========================================
router.post('/legal-codes', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const userPermissions = (req.session as any)?.activeCharacter?.permissions
            || (req as any).user?.permissions;

        const hasAccess = Boolean(userPermissions?.canAddMDCReqCode || userPermissions?.hasAdminAccess);

        if (!hasAccess) {
            return res.status(403).json({ message: 'Brak uprawnień do dodawania przepisów w MDC' });
        }

        const { codeType, code, title } = req.body;

        if (!codeType || !code || !title) {
            return res.status(400).json({ message: 'Kod, typ oraz opis artykułu są wymagane' });
        }

        const newLegalCode = await LegalCode.create({
            codeType,
            code,
            title
        });

        res.status(201).json(newLegalCode);
    } catch (error) {
        console.error('[POST /api/mdc/legal-codes] Błąd serwera:', error);
        res.status(500).json({ message: 'Błąd podczas dodawania artykułu do bazy' });
    }
});

// ==========================================
// 6. USUWANIE PRZEPISU ZE SŁOWNIKA (DELETE /api/mdc/legal-codes/:id)
// ==========================================
router.delete('/legal-codes/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const userPermissions = (req.session as any)?.activeCharacter?.permissions
            || (req as any).user?.permissions;

        const hasAccess = Boolean(userPermissions?.canRemoveMDCReqCode || userPermissions?.hasAdminAccess);

        if (!hasAccess) {
            return res.status(403).json({ message: 'Brak uprawnień do usuwania przepisów w MDC' });
        }

        const { id } = req.params;

        const deletedCode = await LegalCode.findByIdAndDelete(id);

        if (!deletedCode) {
            return res.status(404).json({ message: 'Nie znaleziono podanego artykułu' });
        }

        res.json({ message: 'Pomyślnie usunięto artykuł ze słownika' });
    } catch (error) {
        console.error(`[DELETE /api/mdc/legal-codes/${req.params.id}] Błąd serwera:`, error);
        res.status(500).json({ message: 'Błąd podczas usuwania artykułu ze słownika' });
    }
});

export default router;