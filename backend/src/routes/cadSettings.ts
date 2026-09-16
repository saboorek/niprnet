import { Router, Request, Response } from 'express';
import { CadStatus, CadUnitType } from '../models/CadSettings';

const router = Router();

// --- STATUSY ---
router.get('/statuses', async (_req: Request, res: Response) => {
    try {
        const statuses = await CadStatus.find().sort({ createdAt: 1 });
        res.json(statuses);
    } catch (error) {
        console.error('Błąd podczas pobierania statusów CAD:', error);
        res.status(500).json({ message: 'Nie udało się pobrać statusów' });
    }
});

router.post('/statuses', async (req: Request, res: Response) => {
    try {
        const { name, color } = req.body;
        if (!name) return res.status(400).json({ message: 'Wymagana jest nazwa statusu' });

        const status = new CadStatus({ name, color });
        await status.save();
        res.status(201).json(status);
    } catch (error) {
        console.error('Błąd podczas tworzenia statusu CAD:', error);
        res.status(500).json({ message: 'Błąd serwera podczas zapisywania statusu' });
    }
});

router.delete('/statuses/:id', async (req: Request, res: Response) => {
    try {
        await CadStatus.findByIdAndDelete(req.params.id);
        res.json({ message: 'Pomyślnie usunięto status' });
    } catch (error) {
        console.error('Błąd podczas usuwania statusu CAD:', error);
        res.status(500).json({ message: 'Błąd serwera podczas usuwania statusu' });
    }
});

// --- TYPY JEDNOSTEK ---
router.get('/types', async (_req: Request, res: Response) => {
    try {
        const types = await CadUnitType.find().sort({ createdAt: 1 });
        res.json(types);
    } catch (error) {
        console.error('Błąd podczas pobierania typów CAD:', error);
        res.status(500).json({ message: 'Nie udało się pobrać typów' });
    }
});

router.post('/types', async (req: Request, res: Response) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: 'Wymagana jest nazwa typu' });

        const unitType = new CadUnitType({ name });
        await unitType.save();
        res.status(201).json(unitType);
    } catch (error) {
        console.error('Błąd podczas tworzenia typu CAD:', error);
        res.status(500).json({ message: 'Błąd serwera podczas zapisywania typu' });
    }
});

router.delete('/types/:id', async (req: Request, res: Response) => {
    try {
        await CadUnitType.findByIdAndDelete(req.params.id);
        res.json({ message: 'Pomyślnie usunięto typ' });
    } catch (error) {
        console.error('Błąd podczas usuwania typu CAD:', error);
        res.status(500).json({ message: 'Błąd serwera podczas usuwania typu' });
    }
});

export default router;