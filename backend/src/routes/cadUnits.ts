import { Router, Request, Response } from 'express';
import { CadUnit } from '../models/CadUnit';

const router = Router();

// --- POBIERANIE JEDNOSTEK ---
router.get('/', async (_req: Request, res: Response) => {
    try {
        const units = await CadUnit.find().sort({ createdAt: -1 });
        res.json(units);
    } catch (error) {
        console.error('Błąd podczas pobierania jednostek CAD:', error);
        res.status(500).json({ message: 'Nie udało się pobrać listy jednostek' });
    }
});

// --- TWORZENIE JEDNOSTEK ---
router.post('/', async (req: Request, res: Response) => {
    try {
        const { callsign, unitType, status, characterId, firstName, lastName } = req.body;

        if (!callsign || !unitType || !status) {
            return res.status(400).json({ message: 'Brak wymaganych pól (callsign, unitType, status)' });
        }

        const members = [];
        if (characterId && firstName && lastName) {
            members.push({ characterId, firstName, lastName });
        }

        const newUnit = new CadUnit({
            callsign,
            unitType,
            status,
            members,
            createdBy: characterId || (req.user ? (req.user as any)._id : undefined),
        });

        await newUnit.save();
        res.status(201).json(newUnit);
    } catch (error) {
        console.error('Błąd podczas tworzenia jednostki CAD:', error);
        res.status(500).json({ message: 'Błąd serwera podczas zapisywania jednostki' });
    }
});

// --- AKTUALIZACJA CAŁEJ JEDNOSTKI (PUT) ---
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { callsign, unitType, status } = req.body;

        const updatedUnit = await CadUnit.findByIdAndUpdate(
            req.params.id,
            { callsign, unitType, status },
            { new: true }
        );

        if (!updatedUnit) {
            return res.status(404).json({ message: 'Nie znaleziono jednostki' });
        }

        res.json(updatedUnit);
    } catch (error) {
        console.error('Błąd podczas aktualizacji jednostki:', error);
        res.status(500).json({ message: 'Błąd serwera podczas aktualizacji jednostki' });
    }
});

// --- DOŁĄCZANIE DO JEDNOSTKI ---
router.post('/:id/join', async (req: Request, res: Response) => {
    try {
        const { characterId, firstName, lastName } = req.body;
        if (!characterId) {
            return res.status(400).json({ message: 'Brak danych postaci dołączenia' });
        }

        const unit = await CadUnit.findById(req.params.id);
        if (!unit) return res.status(404).json({ message: 'Nie znaleziono jednostki' });

        const alreadyJoined = unit.members.some((m: any) => m.characterId?.toString() === characterId.toString());
        if (!alreadyJoined) {
            unit.members.push({ characterId, firstName, lastName });
            await unit.save();
        }

        res.json(unit);
    } catch (error) {
        console.error('Błąd podczas dołączania do jednostki:', error);
        res.status(500).json({ message: 'Błąd serwera podczas dołączania do jednostki' });
    }
});

// --- OPUSZCZANIE JEDNOSTKI ---
router.post('/:id/leave', async (req: Request, res: Response) => {
    try {
        const { characterId } = req.body;
        if (!characterId) {
            return res.status(400).json({ message: 'Brak characterId' });
        }

        const unit = await CadUnit.findById(req.params.id);
        if (!unit) return res.status(404).json({ message: 'Nie znaleziono jednostki' });

        unit.members = unit.members.filter((m: any) => m.characterId?.toString() !== characterId.toString());
        await unit.save();

        res.json(unit);
    } catch (error) {
        console.error('Błąd podczas opuszczania jednostki:', error);
        res.status(500).json({ message: 'Błąd serwera podczas opuszczania jednostki' });
    }
});

// --- ZMIANA SAMO STATUSU (PATCH) ---
router.patch('/:id/status', async (req: Request, res: Response) => {
    try {
        const { status } = req.body;
        const updatedUnit = await CadUnit.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!updatedUnit) return res.status(404).json({ message: 'Nie znaleziono jednostki' });
        res.json(updatedUnit);
    } catch (error) {
        console.error('Błąd podczas zmiany statusu:', error);
        res.status(500).json({ message: 'Błąd serwera podczas aktualizacji statusu' });
    }
});

// --- ROZWIĄZANIE / USUNIĘCIE JEDNOSTKI ---
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const deletedUnit = await CadUnit.findByIdAndDelete(req.params.id);
        if (!deletedUnit) return res.status(404).json({ message: 'Nie znaleziono jednostki' });
        res.json({ message: 'Jednostka została rozwiązana' });
    } catch (error) {
        console.error('Błąd podczas usuwania jednostki CAD:', error);
        res.status(500).json({ message: 'Błąd serwera podczas usuwania jednostki' });
    }
});

export default router;