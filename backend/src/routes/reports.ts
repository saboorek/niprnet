import { Router, Request, Response } from 'express';
import { Report } from '../models/Report';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
    try {
        const reports = await Report.find()
            .populate('authorId', 'firstName lastName rank')
            .sort({ createdAt: -1 });

        return res.json(reports);
    } catch (error) {
        return res.status(500).json({ message: 'Błąd podczas pobierania raportów' });
    }
});

router.post('/', async (req: Request, res: Response) => {
    try {
        const { title, type, authorId, description } = req.body;

        if (!title || !authorId || !description) {
            return res.status(400).json({ message: 'Brak wymaganych pól w formularzu' });
        }

        const newReport = new Report({
            title,
            type: type || 'Incident Report',
            authorId,
            description
        });

        await newReport.save();
        return res.status(201).json(newReport);
    } catch (error) {
        return res.status(500).json({ message: 'Błąd podczas tworzenia raportu' });
    }
});

router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const deletedReport = await Report.findByIdAndDelete(id);

        if (!deletedReport) {
            return res.status(404).json({ message: 'Nie odnaleziono raportu' });
        }

        return res.json({ message: 'Raport został usunięty' });
    } catch (error) {
        return res.status(500).json({ message: 'Błąd serwera podczas usuwania' });
    }
});

export default router;