import { Router, Request, Response } from 'express';
import { Structure } from '../models/Structure';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
    try {
        const structure = await Structure.find();
        res.json(structure);
    } catch (err) {
        res.status(500).json({ message: 'Błąd pobierania struktury', error: err });
    }
});

router.post('/squadron', async (req: Request, res: Response) => {
    try {
        const { name } = req.body;
        const squadron = new Structure({ name, sections: [] });
        await squadron.save();
        res.status(201).json(squadron);
    } catch (err) {
        res.status(500).json({ message: 'Błąd tworzenia eskadry', error: err });
    }
});

router.post('/squadron/:squadronId/section', async (req: Request, res: Response) => {
    try {
        const { squadronId } = req.params;
        const { name } = req.body;

        const squadron = await Structure.findById(squadronId);
        if (!squadron) return res.status(404).json({ message: 'Nie znaleziono eskadry' });

        squadron.sections.push({ name, elements: [] });
        await squadron.save();
        res.json(squadron);
    } catch (err) {
        res.status(500).json({ message: 'Błąd dodawania sekcji', error: err });
    }
});

router.post('/section/:sectionId/element', async (req: Request, res: Response) => {
    try {
        const { sectionId } = req.params;
        const { name } = req.body;

        const squadron = await Structure.findOne({ 'sections._id': sectionId });
        if (!squadron) return res.status(404).json({ message: 'Nie znaleziono sekcji' });

        const section = (squadron.sections as any).id(sectionId);
        if (section) {
            section.elements.push({ name });
            await squadron.save();
        }
        res.json(squadron);
    } catch (err) {
        res.status(500).json({ message: 'Błąd dodawania elementu', error: err });
    }
});

router.put('/leadership', async (req: Request, res: Response) => {
    try {
        const { level, targetId, commanderId, deputyCommanderId } = req.body;

        if (level === 'squadron') {
            await Structure.findByIdAndUpdate(targetId, { commanderId, deputyCommanderId });
        } else if (level === 'section') {
            await Structure.updateOne(
                { 'sections._id': targetId },
                {
                    $set: {
                        'sections.$.commanderId': commanderId,
                        'sections.$.deputyCommanderId': deputyCommanderId
                    }
                }
            );
        } else if (level === 'element') {
            await Structure.updateOne(
                { 'sections.elements._id': targetId },
                {
                    $set: {
                        'sections.$[].elements.$[elem].commanderId': commanderId,
                        'sections.$[].elements.$[elem].deputyCommanderId': deputyCommanderId
                    }
                },
                { arrayFilters: [{ 'elem._id': targetId }] }
            );
        }

        res.json({ message: 'Zaktualizowano dowództwo' });
    } catch (err) {
        res.status(500).json({ message: 'Błąd aktualizacji dowództwa', error: err });
    }
});

router.delete('/squadron/:id', async (req: Request, res: Response) => {
    try {
        await Structure.findByIdAndDelete(req.params.id);
        res.json({ message: 'Usunięto eskadrę' });
    } catch (err) {
        res.status(500).json({ message: 'Błąd usuwania eskadry', error: err });
    }
});

router.delete('/section/:id', async (req: Request, res: Response) => {
    try {
        await Structure.updateOne(
            { 'sections._id': req.params.id },
            { $pull: { sections: { _id: req.params.id } } }
        );
        res.json({ message: 'Usunięto sekcję' });
    } catch (err) {
        res.status(500).json({ message: 'Błąd usuwania sekcji', error: err });
    }
});

router.delete('/element/:id', async (req: Request, res: Response) => {
    try {
        await Structure.updateOne(
            { 'sections.elements._id': req.params.id },
            { $pull: { 'sections.$.elements': { _id: req.params.id } } }
        );
        res.json({ message: 'Usunięto element' });
    } catch (err) {
        res.status(500).json({ message: 'Błąd usuwania elementu', error: err });
    }
});

export const structureRouter = router;
export default router;