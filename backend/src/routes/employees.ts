import { Router, Request, Response } from 'express';
import { Character } from '../models/Character';
import { Employee } from '../models/Employee';
import { Role } from '../models/Role';
import { isAuthenticated } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';

const router = Router();

const generateDoDId = (): string => {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
};

router.get('/', isAuthenticated, requirePermission('hasHumanResourcesAccess'), async (_req: Request, res: Response) => {
    try {
        const characters = await Character.find().populate('roles').lean();
        const employees = await Employee.find().lean();

        const empMap = new Map(employees.map(e => [e.characterId.toString(), e]));

        for (const char of characters) {
            if (!empMap.has(char._id.toString())) {
                try {
                    const newEmp = await Employee.findOneAndUpdate(
                        { characterId: char._id },
                        {
                            $setOnInsert: {
                                characterId: char._id,
                                firstName: char.firstName,
                                lastName: char.lastName,
                                doDId: generateDoDId(),
                                status: 'active'
                            } as any
                        },
                        { upsert: true, new: true, setDefaultsOnInsert: true }
                    ).lean();

                    if (newEmp) {
                        empMap.set(char._id.toString(), newEmp);
                    }
                } catch (createErr) {
                    console.error(`[GET /employees] Błąd podczas generowania teczki dla ${char._id}:`, createErr);
                }
            }
        }

        const result = characters.map(char => {
            const empData = empMap.get(char._id.toString());

            const assignedRoles = (char.roles as any[]) || [];
            const rankRole = assignedRoles.find(r => r.type === 'rank');
            const rankName = rankRole ? rankRole.name : 'Brak rangi';

            return {
                _id: empData?._id ?? null,
                characterId: char._id,
                firstName: char.firstName,
                lastName: char.lastName,
                avatarUrl: char.avatarUrl ?? null,
                doDId: empData?.doDId ?? 'N/A',
                rank: rankName,
                status: empData?.status ?? 'active',
                phone: empData?.phone ?? null,
                notes: Array.isArray(empData?.notes) ? empData.notes : [],
                ribbons: empData?.ribbons ?? [],
                squadronId: empData?.squadronId ?? null,
                sectionId: empData?.sectionId ?? null,
            };
        });

        res.json(result);
    } catch (error) {
        console.error('[GET /employees] Błąd serwera:', error);
        res.status(500).json({ message: 'Błąd podczas pobierania pracowników' });
    }
});

router.put('/:characterId', isAuthenticated, requirePermission('hasHumanResourcesAccess'), async (req: Request, res: Response) => {
    try {
        const { characterId } = req.params;
        const { status, phone, notes, ribbons, squadronId, sectionId, rank } = req.body;

        const targetEmployee = await Employee.findOne({
            $or: [{ characterId }, { _id: characterId }]
        });

        if (!targetEmployee) {
            return res.status(404).json({ message: 'Nie znaleziono teczki pracownika' });
        }

        const actualCharacterId = targetEmployee.characterId;

        if (rank) {
            const newRankRole = await Role.findOne({ name: rank, type: 'rank' });
            if (newRankRole) {
                const character = await Character.findById(actualCharacterId);
                if (character) {
                    const allRanks = await Role.find({ type: 'rank' }).select('_id');
                    const rankIdsHex = allRanks.map(r => r._id.toString());

                    const currentRoles = (character.roles || []).map(r => r.toString());
                    const filteredRoles = currentRoles.filter(rId => !rankIdsHex.includes(rId));
                    filteredRoles.push(newRankRole._id.toString());

                    character.roles = filteredRoles as any;
                    await character.save();
                }
            }
        }

        const updateFields: any = {
            status,
            phone,
            notes: Array.isArray(notes) ? notes : [],
            ribbons: ribbons || [],
            squadronId: squadronId || null,
            sectionId: sectionId || null,
        };

        const updatedEmployee = await Employee.findOneAndUpdate(
            { _id: targetEmployee._id },
            { $set: updateFields },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.json(updatedEmployee);
    } catch (error) {
        console.error(`[PUT /employees/${req.params.characterId}] Błąd:`, error);
        res.status(500).json({ message: 'Błąd podczas aktualizacji teczki' });
    }
});

export default router;