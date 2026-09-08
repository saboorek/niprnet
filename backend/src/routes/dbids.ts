import { Router, Request, Response } from 'express';
import { Dbids } from '../models/Dbids';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        const entries = await Dbids.find().sort({ createdAt: -1 });
        res.json(entries);
    } catch (err) {
        res.status(500).json({ message: 'Błąd podczas pobierania bazy DBIDS', error: err });
    }
});

router.post('/', async (req: Request, res: Response) => {
    try {
        const { passNumber, passType, holderName, rankOrStatus, expirationDate, notes } = req.body;

        if (!passNumber || !passType || !holderName || !rankOrStatus) {
            return res.status(400).json({ message: 'Brak wymaganych pól formularza' });
        }

        const existing = await Dbids.findOne({ passNumber });
        if (existing) {
            return res.status(400).json({ message: 'Przepustka o takim numerze jest już zarejestrowana' });
        }

        const newEntry = new Dbids({
            passNumber,
            passType,
            holderName,
            rankOrStatus,
            expirationDate: expirationDate ? new Date(expirationDate) : null,
            notes,
        });

        await newEntry.save();
        res.status(201).json(newEntry);
    } catch (err) {
        res.status(500).json({ message: 'Błąd podczas zapisywania przepustki', error: err });
    }
});

router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const deleted = await Dbids.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ message: 'Nie znaleziono wpisu DBIDS o danym ID' });
        }

        res.json({ message: 'Usunięto wpis z bazy DBIDS' });
    } catch (err) {
        res.status(500).json({ message: 'Błąd podczas usuwania wpisu', error: err });
    }
});

export default router;