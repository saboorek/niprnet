import { Router, Request, Response } from 'express';
import { Report } from '../models/Report';
import { Character } from '../models/Character';
import { sendDiscordMessage } from '../utils/discord';

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

        const author = await Character.findById(authorId);
        const authorName = author ? `${author.firstName} ${author.lastName}` : 'Nieznana postać';

        const reportIdentifier = (newReport as any).reportNumber || (newReport as any).number || `#${newReport._id.toString().slice(-6).toUpperCase()}`;

        const channelId = process.env.DISCORD_CHANNEL_SFS_REPORTS;

        if (channelId) {
            sendDiscordMessage(channelId, {
                title: `📄 Raport: ${reportIdentifier}`,
                color: 0x3498DB,
                fields: [
                    { name: 'Autor', value: authorName, inline: true },
                    { name: 'Typ raportu', value: type || 'Incident Report', inline: true },
                    { name: 'Treść', value: description?.trim() || 'Brak opisu', inline: false },
                ],
                timestamp: new Date().toISOString(),
            });
        }

        return res.status(201).json(newReport);
    } catch (error) {
        console.error('Błąd podczas tworzenia raportu:', error);
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