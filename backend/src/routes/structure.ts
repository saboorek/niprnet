import { Router, Request, Response } from 'express';
import { Structure } from '../models/Structure';
import { isAuthenticated } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';

const router = Router();

// ==========================================
// ESKADRY (SQUADRONS)
// ==========================================

// Pobieranie całej struktury
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const structure = await Structure.find({});
        res.json(structure);
    } catch (err) {
        res.status(500).json({ message: 'Błąd pobierania struktury', error: err });
    }
});

// Tworzenie nowej eskadry
router.post('/squadron', isAuthenticated, requirePermission('canAddStructure'), async (req: Request, res: Response) => {
    try {
        const { name, icon, commanderId, deputyCommanderId } = req.body;

        const newSquadron = new Structure({
            name,
            icon: icon || null,
            commanderId: commanderId || null,
            deputyCommanderId: deputyCommanderId || null,
            sections: []
        });

        await newSquadron.save();
        res.status(201).json(newSquadron);
    } catch (err) {
        res.status(500).json({ message: 'Błąd serwera podczas tworzenia eskadry', error: err });
    }
});

// Edycja eskadry
router.put('/squadron/:squadronId', isAuthenticated, requirePermission('canEditStructure'), async (req: Request, res: Response) => {
    try {
        const { squadronId } = req.params;
        const { name, icon } = req.body;

        const squadron = await Structure.findByIdAndUpdate(
            squadronId,
            { name, icon: icon || null },
            { new: true }
        );

        if (!squadron) return res.status(404).json({ message: 'Nie znaleziono eskadry' });
        res.json(squadron);
    } catch (err) {
        res.status(500).json({ message: 'Błąd edycji eskadry', error: err });
    }
});

// Usuwanie eskadry
router.delete('/squadron/:squadronId', isAuthenticated, requirePermission('canRemoveStructure'), async (req: Request, res: Response) => {
    try {
        await Structure.findByIdAndDelete(req.params.squadronId);
        res.json({ message: 'Usunięto eskadrę' });
    } catch (err) {
        res.status(500).json({ message: 'Błąd usuwania eskadry', error: err });
    }
});

// ==========================================
// DOWÓDZTWO (LEADERSHIP)
// ==========================================

// Aktualizacja dowództwa (dla eskadry lub sekcji)
router.put('/leadership', isAuthenticated, requirePermission('canEditStructure'), async (req: Request, res: Response) => {
    try {
        const { level, targetId, commanderId, deputyCommanderId } = req.body;

        if (level === 'squadron') {
            const squadron = await Structure.findByIdAndUpdate(
                targetId,
                {
                    commanderId: commanderId || null,
                    deputyCommanderId: deputyCommanderId || null
                },
                { new: true }
            );
            if (!squadron) return res.status(404).json({ message: 'Nie znaleziono eskadry' });
            return res.json(squadron);
        } else if (level === 'section') {
            const squadron = await Structure.findOneAndUpdate(
                { 'sections._id': targetId },
                {
                    $set: {
                        'sections.$.commanderId': commanderId || null,
                        'sections.$.deputyCommanderId': deputyCommanderId || null
                    }
                },
                { new: true }
            );
            if (!squadron) return res.status(404).json({ message: 'Nie znaleziono sekcji' });
            return res.json(squadron);
        }

        res.status(400).json({ message: 'Nieprawidłowy poziom dowodzenia' });
    } catch (err) {
        res.status(500).json({ message: 'Błąd zapisu struktury dowodzenia', error: err });
    }
});

// ==========================================
// SEKCJE (SECTIONS)
// ==========================================

router.post('/squadron/:squadronId/section', isAuthenticated, requirePermission('canAddStructure'), async (req: Request, res: Response) => {
    try {
        const { squadronId } = req.params;
        const { name, icon, commanderId, deputyCommanderId } = req.body;

        const squadron = await Structure.findByIdAndUpdate(
            squadronId,
            {
                $push: {
                    sections: {
                        name,
                        icon: icon || null,
                        commanderId: commanderId || null,
                        deputyCommanderId: deputyCommanderId || null,
                        elements: []
                    }
                }
            },
            { new: true }
        );

        if (!squadron) return res.status(404).json({ message: 'Nie znaleziono eskadry' });
        res.json(squadron);
    } catch (err) {
        res.status(500).json({ message: 'Błąd serwera podczas dodawania sekcji', error: err });
    }
});

router.put('/section/:sectionId', isAuthenticated, requirePermission('canEditStructure'), async (req: Request, res: Response) => {
    try {
        const { sectionId } = req.params;
        const { name, icon, commanderId, deputyCommanderId } = req.body;

        const squadron = await Structure.findOneAndUpdate(
            { 'sections._id': sectionId },
            {
                $set: {
                    'sections.$.name': name,
                    'sections.$.icon': icon || null,
                    'sections.$.commanderId': commanderId || null,
                    'sections.$.deputyCommanderId': deputyCommanderId || null
                }
            },
            { new: true }
        );

        if (!squadron) return res.status(404).json({ message: 'Nie znaleziono sekcji' });
        res.json(squadron);
    } catch (err) {
        res.status(500).json({ message: 'Błąd edycji sekcji', error: err });
    }
});

router.delete('/section/:id', isAuthenticated, requirePermission('canRemoveStructure'), async (req: Request, res: Response) => {
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

// ==========================================
// ELEMENTY (ELEMENTS)
// ==========================================

router.post('/section/:sectionId/element', isAuthenticated, requirePermission('canAddStructure'), async (req: Request, res: Response) => {
    try {
        const { sectionId } = req.params;
        const { name } = req.body;

        const squadron = await Structure.findOneAndUpdate(
            { 'sections._id': sectionId },
            { $push: { 'sections.$.elements': { name } } },
            { new: true }
        );

        if (!squadron) return res.status(404).json({ message: 'Nie znaleziono sekcji' });
        res.json(squadron);
    } catch (err) {
        res.status(500).json({ message: 'Błąd dodawania elementu', error: err });
    }
});

router.put('/element/:elementId', isAuthenticated, requirePermission('canEditStructure'), async (req: Request, res: Response) => {
    try {
        const { elementId } = req.params;
        const { name } = req.body;

        const squadron = await Structure.findOneAndUpdate(
            { 'sections.elements._id': elementId },
            { $set: { 'sections.$[].elements.$[elem].name': name } },
            { arrayFilters: [{ 'elem._id': elementId }], new: true }
        );

        if (!squadron) return res.status(404).json({ message: 'Nie znaleziono elementu' });
        res.json(squadron);
    } catch (err) {
        res.status(500).json({ message: 'Błąd edycji elementu', error: err });
    }
});

router.delete('/element/:id', isAuthenticated, requirePermission('canRemoveStructure'), async (req: Request, res: Response) => {
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

export default router;