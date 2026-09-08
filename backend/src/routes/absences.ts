import { Router, Request, Response } from 'express';
import { Absence } from '../models/Absence';
import { syncEmployeeStatuses } from '../utils/syncEmployeeStatuses';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
    try {
        const absences = await Absence.find()
            .populate('characterId', 'firstName lastName rank')
            .sort({ startDate: -1 });

        res.json(absences);
    } catch (error) {
        console.error('Błąd podczas pobierania nieobecności:', error);
        res.status(500).json({ message: 'Nie udało się pobrać listy nieobecności' });
    }
});

router.post('/', async (req: Request, res: Response) => {
    try {
        const { characterId, startDate, endDate, reason } = req.body;

        if (!characterId || !startDate || !endDate) {
            return res.status(400).json({ message: 'Brak wymaganych pól (characterId, startDate, endDate)' });
        }

        const newAbsence = new Absence({
            characterId,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            reason,
            createdBy: req.user ? (req.user as any)._id : undefined,
        });

        await newAbsence.save();

        await syncEmployeeStatuses();

        res.status(201).json(newAbsence);
    } catch (error) {
        console.error('Błąd podczas zapisywania nieobecności:', error);
        res.status(500).json({ message: 'Błąd serwera podczas zapisywania nieobecności' });
    }
});

router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const deletedAbsence = await Absence.findByIdAndDelete(id);

        if (!deletedAbsence) {
            return res.status(404).json({ message: 'Nie znaleziono nieobecności o podanym ID' });
        }

        await syncEmployeeStatuses();

        res.json({ message: 'Pomyślnie usunięto nieobecność' });
    } catch (error) {
        console.error('Błąd podczas usuwania nieobecności:', error);
        res.status(500).json({ message: 'Błąd serwera podczas usuwania nieobecności' });
    }
});

export default router;